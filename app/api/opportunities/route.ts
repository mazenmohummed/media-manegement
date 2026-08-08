// app/api/opportunities/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OpportunityStage, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createOpportunitySchema, ELIGIBLE_EMPLOYEE_ROLES } from "@/lib/validations/opportunity";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunities = await db.opportunity.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      include: {
        personas: true,
        competitors: true,
        products: true,
        client: { select: { id: true, clientName: true, clientNo: true } },
        user: { select: { id: true, name: true, role: true } },
        lead: {
          select: {
            companyName: true,
            contactName: true,
            currency: true,
            expectedCloseDate: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[GET /api/opportunities Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized agency context" },
        { status: 401 }
      );
    }

    const rawBody = await req.json();

    // 1. Validate payload using Zod schema
    const body = createOpportunitySchema.parse(rawBody);

    const {
      name,
      budget,
      stage,
      expectedCloseDate,
      companyMission,
      brandValues,
      marketResearchNotes,
      marketingStrategy,
      communicationStrategy,
      mediaStrategy,
      creativeStrategy,
      launchStrategy,
      kpis,
      personas = [],
      competitors = [],
      products = [],
      leadId,
      clientId,
      userId,
      currency,
    } = body;

    // 2. Validate clientId belongs to agency if provided
    if (clientId) {
      const client = await db.client.findFirst({
        where: { id: clientId, agencyId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json(
          { error: "Client not found or access denied." },
          { status: 404 }
        );
      }
    }

    // 3. Validate userId belongs to agency and has an eligible employee role
    if (userId) {
      const assignedUser = await db.user.findFirst({
        where: { id: userId, agencyId },
        select: { id: true, role: true },
      });
      if (!assignedUser) {
        return NextResponse.json(
          { error: "Assigned employee not found or access denied." },
          { status: 404 }
        );
      }
      if (!ELIGIBLE_EMPLOYEE_ROLES.includes(assignedUser.role)) {
        return NextResponse.json(
          {
            error: `User role '${assignedUser.role}' is not eligible for opportunity assignment.`,
          },
          { status: 403 }
        );
      }
    }

    // 4. Create the opportunity record within the database
    const opportunity = await db.opportunity.create({
      data: {
        name: name.trim(),
        budget: budget !== undefined && budget !== null ? Number(budget) : null,
        stage: stage || OpportunityStage.DISCOVERY,
        currency: currency || "EGP",
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        companyMission: companyMission || null,
        brandValues: brandValues || null,
        marketResearchNotes: marketResearchNotes || null,
        marketingStrategy: marketingStrategy || null,
        communicationStrategy: communicationStrategy || null,
        mediaStrategy: mediaStrategy || null,
        creativeStrategy: creativeStrategy || null,
        launchStrategy: launchStrategy || null,
        kpis: Array.isArray(kpis)
          ? kpis
          : kpis
          ? String(kpis)
              .split(",")
              .map((k: string) => k.trim())
              .filter(Boolean)
          : [],
        agencyId,
        ...(leadId ? { leadId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(userId ? { userId } : {}),

        personas: {
          create: personas
            .filter((p: any) => p.name && p.name.trim() !== "")
            .map((p: any) => ({
              name: p.name.trim(),
              demographics: p.demographics || null,
              psychographics: p.psychographics || null,
              buyingBehavior: p.buyingBehavior || null,
              goals: p.goals || null,
              frustrations: p.frustrations || null,
            })),
        },

        competitors: {
          create: competitors
            .filter((c: any) => c.name && c.name.trim() !== "")
            .map((c: any) => ({
              name: c.name.trim(),
              strengths: c.strengths || null,
              weaknesses: c.weaknesses || null,
              pricingNote: c.pricingNote || null,
              marketShare: c.marketShare || null,
            })),
        },

        products: {
          create: products
            .filter((pr: any) => pr.name && pr.name.trim() !== "")
            .map((pr: any) => ({
              name: pr.name.trim(),
              sku: pr.sku || null,
              price:
                pr.price !== null && pr.price !== "" ? Number(pr.price) : null,
              usp: pr.usp || null,
              painPoints: pr.painPoints || null,
            })),
        },
      },
      include: {
        personas: true,
        competitors: true,
        products: true,
        client: { select: { id: true, clientName: true } },
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/opportunities Error]:", error);

    // Handle Zod validation errors gracefully if thrown
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create opportunity" },
      { status: 500 }
    );
  }
}