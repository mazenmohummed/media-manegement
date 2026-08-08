// app/api/proposals/[proposalId]/accept/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  ProposalStatus,
  ContractStatus,
  ProjectStatus,
  AuditAction,
} from "@prisma/client";

interface RouteParams {
  params: Promise<{ proposalId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;

    const proposal = await db.proposal.findUnique({
      where: { id: proposalId },
      include: {
        lineItems: true,
        contract: true,
        opportunity: {
          include: {
            lead: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                contactEmail: true,
                contactPhone: true,
              },
            },
            client: { select: { id: true } },
            user: { select: { id: true } }, // ← carry over assigned employee
          },
        },
      },
    });

    if (!proposal || proposal.agencyId !== agencyId) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status === ProposalStatus.ACCEPTED && proposal.contract) {
      return NextResponse.json(
        { error: "Proposal is already accepted and has an active contract." },
        { status: 400 }
      );
    }

    // ── Resolve clientId ─────────────────────────────────────────────
    let clientId: string | undefined = undefined;

    if (proposal.opportunity.clientId) {
      clientId = proposal.opportunity.clientId;
    } else if (
      proposal.opportunity.leadId &&
      proposal.opportunity.lead?.companyName
    ) {
      const existingClient = await db.client.findFirst({
        where: {
          agencyId,
          clientName: proposal.opportunity.lead.companyName,
        },
      });

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await db.client.create({
          data: {
            clientName: proposal.opportunity.lead.companyName,
            email: proposal.opportunity.lead.contactEmail ?? undefined,
            phoneNumber: proposal.opportunity.lead.contactPhone ?? undefined,
            agencyId,
          },
        });
        clientId = newClient.id;
      }
    }

    if (!clientId) {
      return NextResponse.json(
        {
          error:
            "A valid Client must be associated with the opportunity/lead before generating a contract.",
        },
        { status: 400 }
      );
    }

    const contractCount = await db.contract.count({ where: { agencyId } });
    const contractNo = `CNT-${new Date().getFullYear()}-${String(
      contractCount + 1
    ).padStart(4, "0")}`;

    // ── Atomic transaction ───────────────────────────────────────────
    const result = await db.$transaction(async (tx) => {
      // 1. Create Contract (with assigned employee carried over)
      const newContract = await tx.contract.create({
        data: {
          contractNo,
          name: `${proposal.opportunity.name} — Contract`,
          status: ContractStatus.ACTIVE,
          monthlyValue: proposal.totalAmount,
          currency: proposal.currency,
          termsUrl: proposal.scope ?? undefined,
          agencyId,
          clientId,
          userId: proposal.opportunity.userId ?? proposal.userId ?? undefined, // ← NEW
        },
      });

      // 2. Mark proposal accepted + link contract & client
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          status: ProposalStatus.ACCEPTED,
          contractId: newContract.id,
          clientId,
          userId: proposal.opportunity.userId ?? proposal.userId ?? undefined, // ← NEW
        },
      });

      // 3. Spin up Project
      const newProject = await tx.project.create({
        data: {
          name: `${proposal.opportunity.name} — Execution`,
          projectName: `${proposal.opportunity.name} — Execution`,
          status: ProjectStatus.ACTIVE,
          totalValue: proposal.totalAmount,
          currency: proposal.currency,
          agencyId,
          clientId,
          contractId: newContract.id,
        },
      });

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityType: "Contract & Project",
          entityId: newContract.id,
          message: `Accepted proposal ${
            proposal.proposalNo || proposal.id
          } generated Contract ${contractNo} and Project ${newProject.id}`,
          agencyId,
        },
      });

      return {
        contract: newContract,
        project: newProject,
        proposal: updatedProposal,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[PROPOSAL_ACCEPT_ERROR]:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to process contract and project generation",
      },
      { status: 500 }
    );
  }
}