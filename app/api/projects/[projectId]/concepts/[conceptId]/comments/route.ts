import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// GET: Fetch all comments for a concept
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify concept exists and belongs to the agency
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: {
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
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
      orderBy: { createdAt: 'asc' },
    });

    // Format comments with mentions
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      author: comment.author,
      mentions: comment.commentMentions.map((mention) => ({
        id: mention.user.id,
        name: mention.user.name,
      })),
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error('Error fetching concept comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST: Create a comment on a concept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId } = await params;
    const body = await req.json();
    const { text, mentionedUserIds = [] } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, id: true },
    });

    // Verify concept exists and belongs to the agency
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        conceptId,
        agencyId: user?.agencyId!,
        authorId: session.user.id,
        commentMentions: {
          create: mentionedUserIds.map((userId: string) => ({
            userId,
            agencyId: user?.agencyId!,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
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

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Comment',
        entityId: comment.id,
        message: `Added comment on concept "${concept.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    const formattedComment = {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      author: comment.author,
      mentions: comment.commentMentions.map((mention) => ({
        id: mention.user.id,
        name: mention.user.name,
      })),
    };

    return NextResponse.json({ comment: formattedComment }, { status: 201 });
  } catch (error) {
    console.error('Error creating concept comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}