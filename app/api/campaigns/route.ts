// app/api/campaigns/route.ts
// app/api/campaigns/route.ts
import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Agency-Id",
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // prefer query param, fallback to header
    const agencyIdFromQuery = url.searchParams.get("agencyId") ?? undefined;
    const agencyIdFromHeader = req.headers.get("x-agency-id") ?? undefined;
    const agencyId = agencyIdFromQuery ?? agencyIdFromHeader;

    console.log("[GET /api/campaigns] agencyIdFromQuery:", agencyIdFromQuery, "agencyIdFromHeader:", agencyIdFromHeader);

    const where: any = {};
    if (agencyId) where.agencyId = agencyId;

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        _count: { select: { projects: true } },
      },
    });

    console.log(`[GET /api/campaigns] found ${campaigns.length} campaigns for agencyId=${agencyId ?? "none"}`);

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

    // Return both the array and the count to help debug in client
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
  else d.setDate(d.getDate() + count); // default to days
  return d;
}

export async function POST(req: NextRequest) {
  try {
    // Safe parse
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      return jsonResponse({ error: "Invalid or missing JSON body" }, 400);
    }

    /**
     * Expected top-level fields:
     * - name, clientId, agencyId
     * - objective, budget, currency, startDate, endDate, status
     * - projects?: ProjectInput[]
     *
     * ProjectInput (optional) shape:
     * {
     *   projectName: string,
     *   projectStory?: string,
     *   cloudLink?: string,
     *   totalValue?: number,
     *   currency?: string,
     *   startDate?: string,
     *   endDate?: string,
     *   tasks?: TaskInput[]
     * }
     *
     * TaskInput:
     * {
     *   title: string,
     *   description?: string,
     *   startDate?: string,
     *   endDate?: string,
     *   assigneeIds?: string[],
     *   assetIds?: string[],
     *   grossRevenue?: number,
     *   margin?: number,
     *   // optional repeat
     *   repeat?: {
     *     frequency: "DAILY" | "WEEKLY" | "MONTHLY",
     *     occurrences: number
     *   }
     * }
     */

    const {
      name,
      clientId,
      agencyId,
      startDate,
      endDate,
      budget = 0,
      objective,
      currency = "EGP",
      status = "PLANNED",
      projects = [],
    } = body ?? {};

    if (!name || !agencyId || !clientId) {
      return jsonResponse({ error: "Missing required fields: name, agencyId, clientId" }, 400);
    }

    // Basic client verification
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return jsonResponse({ error: "Client not found" }, 400);
    if (client.agencyId !== agencyId) {
      return jsonResponse({ error: "Client does not belong to the specified agency" }, 400);
    }

    // We'll create campaign + projects + tasks in a transaction
    // Build nested create data for projects & tasks - but because we may need to expand repeated tasks
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

    // Build projects array for nested create
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
        // link to campaign after campaign created (we'll use nested create so prisma handles relation)
        startDate: p.startDate ? new Date(p.startDate) : undefined,
        // endDate not in Project model — we skip
      };

      // Tasks creation
      const tasksCreate: any[] = [];

      if (Array.isArray(p.tasks)) {
        for (const t of p.tasks) {
          const baseStart = t.startDate ? new Date(t.startDate) : (p.startDate ? new Date(p.startDate) : new Date());
          const baseEnd = t.endDate ? new Date(t.endDate) : null;

          // If repeat instruction present, generate occurrences
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
                project: undefined, // nested into project create
                assigneeIds: t.assigneeIds ?? [],
                assetIds: t.assetIds ?? [],
                grossRevenue: t.grossRevenue ?? 0,
                margin: t.margin ?? 30,
                status: t.status ?? "PENDING",
                // we map numeric values expected by Task model
              });
            }
          } else {
            // single task
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

      // attach tasks to project if any
      if (tasksCreate.length > 0) projectObj.tasks = { create: tasksCreate };

      projectsToCreate.push(projectObj);
    }

    // create campaign with nested projects (and nested tasks)
    // NOTE: nested creates of projects -> tasks will set project.campaignId automatically
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

      // If you want returned created projects & tasks from tx, you may need to separately query them.
      return camp;
    });

    // Return created campaign summary
    return jsonResponse({
      id: created.id,
      name: created.name,
      clientId: created.clientId,
      agencyId: created.agencyId,
      projectsCount: created._count?.projects ?? 0,
      createdAt: created.createdAt?.toISOString() ?? null,
    }, 201);
  } catch (err) {
    console.error("Campaigns POST error:", err);
    return jsonResponse({ error: "Failed to create campaign and projects" }, 500);
  }
}