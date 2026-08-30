// app/api/projects/[projectId]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/projects/[projectId]/comments ──────────────────────────────────
export const GET = withAuthGuard("project:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    const db = getScopedPrisma(agencyId);

    const comments = await db.comment.findMany({
      where: {
        task: {
          projectId: projectId,
          agencyId: agencyId,
          deletedAt: null,
        },
        agencyId: agencyId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        commentMentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedComments = comments.map((comment) => ({
      ...comment,
      mentions: comment.commentMentions.map((m) => m.user),
    }));

    return NextResponse.json({ success: true, comments: formattedComments });
  } catch (error: any) {
    console.error("[GET_PROJECT_COMMENTS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
});

// ─── POST /api/projects/[projectId]/comments ──────────────────────────────────
export const POST = withAuthGuard("project:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    const body = await req.json();
    const { text, mentionedUserIds } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Get the current user
    const authorId = req.headers.get("x-user-id");
    let authorName = "Someone";
    if (authorId) {
      const author = await db.user.findFirst({
        where: { id: authorId, agencyId },
        select: { name: true },
      });
      if (author) authorName = author.name;
    }

    // Verify project exists
    const project = await db.project.findFirst({
      where: { id: projectId, agencyId, deletedAt: null },
      include: {
        client: {
          select: { id: true, clientName: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create a comment (attached to a task or directly to project)
    // For simplicity, we'll create a comment on a dummy task or use a project-level comment model
    // Since Comment model requires taskId, we need to handle this differently
    // Option: Find any task in the project or create a system task for project-level comments

    // Find a task to attach the comment to (use the first task or create a system task)
    let task = await db.task.findFirst({
      where: {
        projectId: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
    });

    if (!task) {
      // Create a system task for project-level comments
      task = await db.task.create({
        data: {
          title: "Project Comments",
          taskType: "COMMENT",
          status: "PENDING",
          projectId: projectId,
          agencyId: agencyId,
          description: "System task for project-level comments",
        },
      });
    }

    // Create the comment
    const comment = await db.comment.create({
      data: {
        text: text.trim(),
        taskId: task.id,
        agencyId: agencyId,
        authorId: authorId || undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // ─── Create Notifications ──────────────────────────────────────────────

    const notifications: any[] = [];

    // 1. Notify mentioned users
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const mentionedUsers = await db.user.findMany({
        where: {
          id: { in: mentionedUserIds },
          agencyId: agencyId,
          isActive: true,
        },
        select: { id: true, name: true },
      });

      for (const user of mentionedUsers) {
        if (user.id === authorId) continue;

        notifications.push({
          userId: user.id,
          agencyId: agencyId,
          title: "Mentioned in Project Comment",
          message: `${project.name}: @${authorName} mentioned you in a comment`,
          type: "COMMENT",
          actionUrl: `/dashboard/projects/${projectId}`,
        });
      }

      // Create CommentMention records
      await db.commentMention.createMany({
        data: mentionedUsers.map((user) => ({
          commentId: comment.id,
          userId: user.id,
          agencyId: agencyId,
        })),
      });
    }

    // 2. Notify project client
    if (project.clientId) {
      const clientUsers = await db.user.findMany({
        where: {
          clientId: project.clientId,
          isActive: true,
        },
        select: { id: true },
      });

      const mentionedIds = new Set(mentionedUserIds || []);
      for (const clientUser of clientUsers) {
        if (mentionedIds.has(clientUser.id) || clientUser.id === authorId) continue;
        notifications.push({
          userId: clientUser.id,
          agencyId: agencyId,
          title: "New Project Comment",
          message: `${project.name}: New comment from ${authorName}`,
          type: "COMMENT",
          actionUrl: `/dashboard/projects/${projectId}`,
        });
      }
    }

    // Create all notifications
    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications,
      });
    }

    // Return comment with mentions
    const commentWithMentions = await db.comment.findUnique({
      where: { id: comment.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        commentMentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        ...commentWithMentions,
        mentions: commentWithMentions?.commentMentions.map((m) => m.user) || [],
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[CREATE_PROJECT_COMMENT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
});