import { NextResponse } from "next/server";
import { qstashClient } from "@/lib/queue/qstash";

// Unwrapped POST handler for setup
export async function POST() {
  try {
    const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const destinationUrl = `${appBaseUrl}/api/jobs/heartbeat`;

    const schedule = await qstashClient.schedules.create({
      destination: destinationUrl,
      cron: "*/15 * * * *",
    });

    return NextResponse.json({
      message: "Scheduled heartbeat cron job registered successfully",
      scheduleId: schedule.scheduleId,
      destination: destinationUrl,
    });
  } catch (error: any) {
    console.error("[REGISTER_CRON_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}