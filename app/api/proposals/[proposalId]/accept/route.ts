import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ProposalStatus, ContractStatus, ProjectStatus, AuditAction } from "@prisma/client";

interface RouteParams {
  params: Promise<{ proposalId: string }>;
}

// POST: Accept proposal, generate Contract, and automatically spin up a Project
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;

    // Fetch proposal with opportunity, lead context, and client
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
                contactPhone: true 
              } 
            },
            client: { select: { id: true } },
          },
        },
      },
    });

    if (!proposal || proposal.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status === ProposalStatus.ACCEPTED && proposal.contract) {
      return NextResponse.json(
        { error: "Proposal is already accepted and has an active contract." },
        { status: 400 }
      );
    }

    // Resolve or find the Client ID safely handling types and fallbacks
    let clientId: string | undefined = undefined;

    // 1. Check if opportunity already has a direct client attached
    if (proposal.opportunity.clientId) {
      clientId = proposal.opportunity.clientId;
    } 
    // 2. Otherwise check if there is a lead with a company name
    else if (proposal.opportunity.leadId && proposal.opportunity.lead?.companyName) {
      const existingClient = await db.client.findFirst({
        where: { 
          agencyId: session.user.agencyId,
          clientName: proposal.opportunity.lead.companyName,
        },
      });

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Fallback: Create a quick client record from the lead info safely handling nulls
        const newClient = await db.client.create({
          data: {
            clientName: proposal.opportunity.lead.companyName,
            email: proposal.opportunity.lead.contactEmail ?? undefined,
            phoneNumber: proposal.opportunity.lead.contactPhone ?? undefined,
            agencyId: session.user.agencyId,
          },
        });
        clientId = newClient.id;
      }
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "A valid Client must be associated with the opportunity/lead before generating a contract." },
        { status: 400 }
      );
    }

    // Generate unique contract number
    const contractCount = await db.contract.count({
      where: { agencyId: session.user.agencyId },
    });
    const contractNo = `CNT-${new Date().getFullYear()}-${String(contractCount + 1).padStart(4, "0")}`;

    // Perform atomic transaction: update proposal, create contract, and initialize project
    const result = await db.$transaction(async (tx) => {
      // 1. Mark proposal as accepted
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.ACCEPTED },
      });

      // 2. Create the Contract carrying over client context, value, currency, and scope terms
      const newContract = await tx.contract.create({
        data: {
          contractNo,
          name: `${proposal.opportunity.name} — Contract`,
          status: ContractStatus.ACTIVE,
          totalAmount: proposal.totalAmount,
          currency: proposal.currency,
          scope: proposal.scope,
          paymentSchedule: proposal.paymentSchedule,
          agencyId: session.user.agencyId,
          opportunityId: proposal.opportunityId,
          proposalId: proposal.id,
          clientId: clientId,
          ...(proposal.opportunity.leadId && { leadId: proposal.opportunity.leadId }),
        },
      });

      // 3. Automatically spin up a real Project from the contract
      const newProject = await tx.project.create({
        data: {
          name: `${proposal.opportunity.name} — Execution`,
          projectName: `${proposal.opportunity.name} — Execution`,
          status: ProjectStatus.ACTIVE,
          totalValue: proposal.totalAmount,
          currency: proposal.currency,
          agencyId: session.user.agencyId,
          clientId: clientId,
          contractId: newContract.id,
        },
      });

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityType: "Contract & Project",
          entityId: newContract.id,
          message: `Accepted proposal ${proposal.proposalNo || proposal.id} generated Contract ${contractNo} and Project ${newProject.id}`,
          agencyId: session.user.agencyId,
        },
      });

      return { contract: newContract, project: newProject, proposal: updatedProposal };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process contract and project generation" },
      { status: 500 }
    );
  }
}