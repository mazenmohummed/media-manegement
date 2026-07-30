import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "../../../lib/prisma";
import { authOptions } from "@/lib/authOptions"; // Adjust this path if your authOptions location differs

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        _count: { select: { projects: true } },
      },
    });

    const payload = campaigns.map((c) => ({
      id: c.id,
      campaignNo: (c as any).campaignNo ?? null,
      name: c.name,
      objective: c.objective ?? null,
      status: c.status ?? null,
      budget: c.budget ?? 0,
      currency: c.currency ?? null,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      client: c.client ? { id: c.client.id, clientName: (c.client as any).clientName } : null,
      projectsCount: c._count?.projects ?? 0,
      createdAt: c.createdAt?.toISOString() ?? null,
      updatedAt: c.updatedAt?.toISOString() ?? null,
    }));

    return jsonResponse({ count: payload.length, campaigns: payload }, 200);
  } catch (err) {
    console.error("Campaigns GET error:", err);
    return jsonResponse({ error: "Failed to fetch campaigns" }, 500);
  }
}

/**
 * Helper: generate date occurrences for repeat schedules
 * supported frequencies: "DAILY", "WEEKLY", "MONTHLY"
 */
function addInterval(date: Date, freq: string, count: number) {
  const d = new Date(date.getTime());
  if (freq === "DAILY") d.setDate(d.getDate() + count);
  else if (freq === "WEEKLY") d.setDate(d.getDate() + count * 7);
  else if (freq === "MONTHLY") d.setMonth(d.getMonth() + count);
  else d.setDate(d.getDate() + count);
  return d;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      return jsonResponse({ error: "Invalid or missing JSON body" }, 400);
    }

    const {
      name,
      clientId,
      startDate,
      endDate,
      budget = 0,
      objective,
      currency = "EGP",
      status = "PLANNED",
      projects = [],
    } = body ?? {};

    if (!name || !clientId) {
      return jsonResponse({ error: "Missing required fields: name, clientId" }, 400);
    }

    // Verify client exists and belongs strictly to authenticated agency
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return jsonResponse({ error: "Client not found" }, 400);
    if (client.agencyId !== agencyId) {
      return jsonResponse({ error: "Client does not belong to your workspace" }, 403);
    }

    const campaignData: any = {
      name,
      clientId,
      agencyId,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      budget: Number(budget || 0),
      objective,
      currency,
      status,
    };

    const projectsToCreate: any[] = [];

    for (const p of projects) {
      const projectObj: any = {
        projectName: p.projectName,
        projectStory: p.projectStory ?? undefined,
        cloudLink: p.cloudLink ?? undefined,
        totalValue: p.totalValue !== undefined ? Number(p.totalValue) : 0,
        currency: p.currency ?? currency,
        clientId,
        agencyId,
        startDate: p.startDate ? new Date(p.startDate) : undefined,
      };

      const tasksCreate: any[] = [];

      if (Array.isArray(p.tasks)) {
        for (const t of p.tasks) {
          const baseStart = t.startDate ? new Date(t.startDate) : (p.startDate ? new Date(p.startDate) : new Date());
          const baseEnd = t.endDate ? new Date(t.endDate) : null;

          if (t.repeat && t.repeat.frequency && t.repeat.occurrences && t.repeat.occurrences > 0) {
            const occ = Number(t.repeat.occurrences);
            const freq = t.repeat.frequency;
            for (let i = 0; i < occ; i++) {
              const s = addInterval(baseStart, freq, i);
              const e = baseEnd ? addInterval(baseEnd, freq, i) : null;

              tasksCreate.push({
                taskType: t.title || "Task",
                title: t.title || "Task",
                description: t.description ?? undefined,
                startDate: s,
                endDate: e ?? undefined,
                agencyId,
                clientId,
                assigneeIds: t.assigneeIds ?? [],
                assetIds: t.assetIds ?? [],
                grossRevenue: t.grossRevenue ?? 0,
                margin: t.margin ?? 30,
                status: t.status ?? "PENDING",
              });
            }
          } else {
            tasksCreate.push({
              taskType: t.title || "Task",
              title: t.title || "Task",
              description: t.description ?? undefined,
              startDate: baseStart,
              endDate: baseEnd ?? undefined,
              agencyId,
              clientId,
              assigneeIds: t.assigneeIds ?? [],
              assetIds: t.assetIds ?? [],
              grossRevenue: t.grossRevenue ?? 0,
              margin: t.margin ?? 30,
              status: t.status ?? "PENDING",
            });
          }
        }
      }

      if (tasksCreate.length > 0) projectObj.tasks = { create: tasksCreate };

      projectsToCreate.push(projectObj);
    }

    const created = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          ...campaignData,
          projects: projectsToCreate.length > 0 ? { create: projectsToCreate } : undefined,
        },
        include: {
          _count: { select: { projects: true } },
        },
      });

      return camp;
    });

    return jsonResponse(
      {
        id: created.id,
        name: created.name,
        clientId: created.clientId,
        agencyId: created.agencyId,
        projectsCount: created._count?.projects ?? 0,
        createdAt: created.createdAt?.toISOString() ?? null,
      },
      201
    );
  } catch (err) {
    console.error("Campaigns POST error:", err);
    return jsonResponse({ error: "Failed to create campaign and projects" }, 500);
  }
}