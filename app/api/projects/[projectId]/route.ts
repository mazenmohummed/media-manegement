// app/api/projects/[projectId]/route.ts
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET: Fetch a single project with its details
export const GET = withAuthGuard("project:read", async (req: Request, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            phoneNumber: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNo: true,
            status: true,
            name: true,
          },
        },
        milestones: {
          select: {
            id: true,
            name: true,
            status: true,
            deadline: true,
            budget: true,
            description: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            dueDate: true,
            assignees: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        brief: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
            attachments: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project, { status: 200 });
  } catch (error: any) {
    console.error("[PROJECT_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

// PATCH: Update a project (partial update)
export const PATCH = withAuthGuard("project:update", async (req: Request, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Verify project exists and belongs to agency
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Allowed fields for update
    const allowedFields = [
      'name',
      'projectName',
      'status',
      'targetDeadline',
      'projectStory',
      'cloudLink',
      'totalValue',
      'currency',
      'invoiceNo',
      'invoiceStatus',
      'clientId',
      'contractId',
      'campaignId',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle tags separately
    if (body.tagIds !== undefined) {
      updateData.tags = {
        set: body.tagIds.map((id: string) => ({ id })),
      };
    }

    // If clientId is being updated, verify client belongs to agency
    if (updateData.clientId) {
      const client = await db.client.findFirst({
        where: {
          id: updateData.clientId,
          agencyId: agencyId,
        },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json(
          { error: "Client not found or does not belong to your agency" },
          { status: 400 }
        );
      }
    }

    // If contractId is being updated, verify contract belongs to agency
    if (updateData.contractId) {
      const contract = await db.contract.findFirst({
        where: {
          id: updateData.contractId,
          agencyId: agencyId,
        },
        select: { id: true },
      });

      if (!contract) {
        return NextResponse.json(
          { error: "Contract not found or does not belong to your agency" },
          { status: 400 }
        );
      }
    }

    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNo: true,
            status: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error: any) {
    console.error("[PROJECT_PATCH_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

// PUT: Update a project (full update - including tags)
export const PUT = withAuthGuard("project:update", async (req: Request, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Verify project exists and belongs to agency
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      projectName,
      status,
      targetDeadline,
      projectStory,
      cloudLink,
      totalValue,
      currency,
      invoiceNo,
      invoiceStatus,
      clientId,
      contractId,
      campaignId,
      tagIds,
    } = body;

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (projectName !== undefined) updateData.projectName = projectName;
    if (status !== undefined) updateData.status = status;
    if (targetDeadline !== undefined) {
      updateData.targetDeadline = targetDeadline ? new Date(targetDeadline) : null;
    }
    if (projectStory !== undefined) updateData.projectStory = projectStory;
    if (cloudLink !== undefined) updateData.cloudLink = cloudLink;
    if (totalValue !== undefined) updateData.totalValue = totalValue;
    if (currency !== undefined) updateData.currency = currency;
    if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo;
    if (invoiceStatus !== undefined) updateData.invoiceStatus = invoiceStatus;

    // Handle relations
    if (clientId !== undefined) {
      if (clientId) {
        const client = await db.client.findFirst({
          where: { id: clientId, agencyId: agencyId },
          select: { id: true },
        });
        if (!client) {
          return NextResponse.json(
            { error: "Client not found or does not belong to your agency" },
            { status: 400 }
          );
        }
        updateData.clientId = clientId;
      } else {
        updateData.clientId = null;
      }
    }

    if (contractId !== undefined) {
      if (contractId) {
        const contract = await db.contract.findFirst({
          where: { id: contractId, agencyId: agencyId },
          select: { id: true },
        });
        if (!contract) {
          return NextResponse.json(
            { error: "Contract not found or does not belong to your agency" },
            { status: 400 }
          );
        }
        updateData.contractId = contractId;
      } else {
        updateData.contractId = null;
      }
    }

    if (campaignId !== undefined) {
      if (campaignId) {
        const campaign = await db.campaign.findFirst({
          where: { id: campaignId, agencyId: agencyId },
          select: { id: true },
        });
        if (!campaign) {
          return NextResponse.json(
            { error: "Campaign not found or does not belong to your agency" },
            { status: 400 }
          );
        }
        updateData.campaignId = campaignId;
      } else {
        updateData.campaignId = null;
      }
    }

    // Handle tags
    if (tagIds !== undefined) {
      // Verify all tags belong to the agency
      if (tagIds.length > 0) {
        const tags = await db.tag.findMany({
          where: {
            id: { in: tagIds },
            agencyId: agencyId,
          },
          select: { id: true },
        });
        if (tags.length !== tagIds.length) {
          return NextResponse.json(
            { error: "One or more tags not found or do not belong to your agency" },
            { status: 400 }
          );
        }
      }
      updateData.tags = {
        set: tagIds.map((id: string) => ({ id })),
      };
    }

    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNo: true,
            status: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error: any) {
    console.error("[PROJECT_PUT_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

// DELETE: Soft delete a project
export const DELETE = withAuthGuard("project:delete", async (req: Request, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Verify project exists and belongs to agency
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if project can be deleted
    if (existingProject.status === "ACTIVE" && existingProject._count.tasks > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete an active project with tasks. Archive it instead.",
          projectName: existingProject.name,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project archived successfully",
        projectId: projectId,
        projectName: existingProject.name,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[PROJECT_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});