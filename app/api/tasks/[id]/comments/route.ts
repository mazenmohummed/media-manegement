import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { text } = await req.json();

    if (!text) return new NextResponse("Text required", { status: 400 });

    const comment = await db.comment.create({
      data: {
        text,
        taskId: id,
        // Optional: authorId: "some-user-id" 
      },
      include: {
        author: true,
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("COMMENT_POST_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}