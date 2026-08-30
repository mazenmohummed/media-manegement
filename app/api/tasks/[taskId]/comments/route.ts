// app/api/tasks/[taskId]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/tasks/[taskId]/comments ──────────────────────────────────────
export const GET = withAuthGuard("comment:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const taskId = params.taskId;

    const db = getScopedPrisma(agencyId);

    const comments = await db.comment.findMany({
      where: {
        taskId: taskId,
        agencyId: agencyId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error("[GET_COMMENTS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
});

// ─── POST /api/tasks/[taskId]/comments ──────────────────────────────────────
// app/api/tasks/[taskId]/comments/route.ts - Updated POST handler

export const POST = withAuthGuard("comment:create", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const taskId = params.taskId;

    const body = await req.json();
    const { text, mentionedUserIds } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Get the current user ID and details from the request
    const authorId = req.headers.get("x-user-id");
    
    // ✅ Fetch author details to get the name
    let authorName = "Someone";
    if (authorId) {
      const author = await db.user.findFirst({
        where: { id: authorId, agencyId },
        select: { name: true },
      });
      if (author) {
        authorName = author.name;
      }
    }

    // Verify task exists
    const task = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
      include: {
        assignees: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create the comment
    const comment = await db.comment.create({
      data: {
        text: text.trim(),
        taskId: taskId,
        agencyId: agencyId,
        authorId: authorId || undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    // ─── Create Notifications ──────────────────────────────────────────────

    const notifications: any[] = [];
    const taskActionUrl = `/dashboard/tasks/${taskId}`; // ✅ Define once

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
          title: "Mentioned in Comment",
          message: `Task: ${task.title || task.taskNo || "Task"} - @${authorName} mentioned you in a comment`,
          type: "COMMENT",
          actionUrl: taskActionUrl, // ✅ Added actionUrl
        });
      }
    }

    // 2. Notify task assignees
    if (task.assignees && task.assignees.length > 0) {
      const mentionedIds = new Set(mentionedUserIds || []);
      
      for (const assignee of task.assignees) {
        if (mentionedIds.has(assignee.id) || assignee.id === authorId) continue;

        notifications.push({
          userId: assignee.id,
          agencyId: agencyId,
          title: "New Comment on Assigned Task",
          message: `Task: ${task.title || task.taskNo || "Task"} - New comment from ${authorName}`,
          type: "COMMENT",
          actionUrl: taskActionUrl, // ✅ Added actionUrl
        });
      }
    }

    // 3. Notify project leads
    if (task.project) {
      const projectLeads = await db.resourceAllocation.findMany({
        where: {
          projectId: task.project.id,
          allocationPercent: { gte: 50 },
          endDate: null,
        },
        include: {
          user: {
            select: { id: true },
          },
        },
      });

      const leadIds = new Set(projectLeads.map(p => p.userId));
      const mentionedIds = new Set(mentionedUserIds || []);
      
      for (const leadId of leadIds) {
        if (mentionedIds.has(leadId) || leadId === authorId) continue;
        if (task.assignees.some(a => a.id === leadId)) continue;

        notifications.push({
          userId: leadId,
          agencyId: agencyId,
          title: "New Comment on Project Task",
          message: `Task: ${task.title || task.taskNo || "Task"} - New comment on project ${task.project.name} from ${authorName}`,
          type: "COMMENT",
          actionUrl: taskActionUrl, // ✅ Added actionUrl
        });
      }
    }

    // Create all notifications
    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications,
      });
    }

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error: any) {
    console.error("[CREATE_COMMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
});
// ─── DELETE /api/tasks/[taskId]/comments/[commentId] ──────────────────────
export const DELETE = withAuthGuard("comment:delete", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const taskId = params.taskId;
    const commentId = params.commentId;

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const comment = await db.comment.findFirst({
      where: {
        id: commentId,
        taskId: taskId,
        agencyId: agencyId,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await db.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE_COMMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
});

// ─── PATCH /api/tasks/[taskId]/comments/[commentId] ──────────────────────
export const PATCH = withAuthGuard("comment:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const taskId = params.taskId;
    const commentId = params.commentId;

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const comment = await db.comment.findFirst({
      where: {
        id: commentId,
        taskId: taskId,
        agencyId: agencyId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (comment.authorId !== userId && !["SUPERADMIN", "ADMIN"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "You are not authorized to edit this comment" },
        { status: 403 }
      );
    }

    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: {
        text: text.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    return NextResponse.json({ success: true, comment: updatedComment });
  } catch (error: any) {
    console.error("[UPDATE_COMMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update comment" },
      { status: 500 }
    );
  }
});