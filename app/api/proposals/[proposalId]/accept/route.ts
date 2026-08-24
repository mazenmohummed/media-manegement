import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  ProposalStatus,
  ContractStatus,
  ProjectStatus,
  TaskStatus,
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
    const body = await request.json().catch(() => ({}));
    const { templateId } = body;

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
            user: { select: { id: true } },
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

    // ── Pre-fetch template (outside tx for validation) ───────────────
    let template: {
      items: {
        id: string;
        milestoneName: string;
        taskTitle: string;
        taskType: string | null;
        description: string | null;
        estimatedHours: number;
        order: number;
        categoryId: string | null;
      }[];
    } | null = null;

    if (templateId) {
      template = await db.projectTemplate.findUnique({
        where: { id: templateId, agencyId },
        include: {
          items: {
            orderBy: { order: "asc" },
          },
        },
      });
      if (!template) {
        return NextResponse.json(
          { error: "Selected template not found" },
          { status: 404 }
        );
      }
    }

    const contractCount = await db.contract.count({ where: { agencyId } });
    const contractNo = `CNT-${new Date().getFullYear()}-${String(
      contractCount + 1
    ).padStart(4, "0")}`;

    // ── Atomic transaction ───────────────────────────────────────────
    const result = await db.$transaction(async (tx) => {
      // 1. Create Contract
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
          userId: proposal.opportunity.userId ?? proposal.userId ?? undefined,
        },
      });

      // 2. Mark proposal accepted + link contract & client
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          status: ProposalStatus.ACCEPTED,
          contractId: newContract.id,
          clientId,
          userId: proposal.opportunity.userId ?? proposal.userId ?? undefined,
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

      // 4. Instantiate Milestones + Tasks from Template
      const createdMilestones: { id: string; name: string }[] = [];
      const createdTasks: { id: string; title: string }[] = [];

      if (template) {
        const milestoneMap = new Map<string, string>();

        for (const item of template.items) {
          let milestoneId: string | undefined;

          // Group by milestone name — create once, reuse ID
          if (item.milestoneName?.trim()) {
            const key = item.milestoneName.trim();
            if (!milestoneMap.has(key)) {
              const milestone = await tx.milestone.create({
                data: {
                  name: key,
                  projectId: newProject.id,
                  agencyId,
                  order: item.order,
                  budget: 0,
                  currency: proposal.currency,
                },
              });
              milestoneMap.set(key, milestone.id);
              createdMilestones.push({ id: milestone.id, name: key });
            }
            milestoneId = milestoneMap.get(key);
          }

          // Create task if title exists
          if (item.taskTitle?.trim()) {
            const task = await tx.task.create({
              data: {
                taskType: item.taskType?.trim() || "General",
                title: item.taskTitle.trim(),
                description: item.description?.trim() || null,
                estimatedHours: item.estimatedHours || 0,
                status: TaskStatus.PENDING,
                projectId: newProject.id,
                agencyId,
                milestoneId,
                categoryId: item.categoryId || undefined,
              },
            });
            createdTasks.push({ id: task.id, title: item.taskTitle.trim() });
          }
        }
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityType: "Contract & Project",
          entityId: newContract.id,
          message: template
            ? `Accepted proposal ${
                proposal.proposalNo || proposal.id
              } generated Contract ${contractNo}, Project ${
                newProject.id
              }, ${createdMilestones.length} milestones, ${
                createdTasks.length
              } tasks from template "${templateId}"`
            : `Accepted proposal ${
                proposal.proposalNo || proposal.id
              } generated Contract ${contractNo} and Project ${newProject.id}`,
          agencyId,
        },
      });

      return {
        contract: newContract,
        project: newProject,
        proposal: updatedProposal,
        milestones: createdMilestones,
        tasks: createdTasks,
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