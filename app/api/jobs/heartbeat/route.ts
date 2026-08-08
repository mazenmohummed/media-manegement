import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { default as prisma } from "@/lib/prisma";

// Force dynamic execution so Next.js doesn't cache route execution
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    const now = new Date().toISOString();
    console.log(`[HEARTBEAT_JOB] Background runner alive at ${now}`);

    // Verify DB connection & query core data
    const activeAgenciesCount = await prisma.agency.count();

    console.log(
      `[HEARTBEAT_JOB_SUCCESS] Database accessible. Total Agencies: ${activeAgenciesCount}`
    );

    return NextResponse.json({
      status: "healthy",
      timestamp: now,
      activeAgenciesCount,
    });
  } catch (error: any) {
    console.error("[HEARTBEAT_JOB_ERROR]", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

// Automatically verifies 'upstash-signature' using QSTASH_CURRENT_SIGNING_KEY & QSTASH_NEXT_SIGNING_KEY from process.env
export const POST = verifySignatureAppRouter(handler);