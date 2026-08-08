// app/api/opportunities/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OpportunityStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";


export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    const opportunities = await db.opportunity.findMany({
      where: agencyId ? { agencyId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        personas: true,
        competitors: true,
        products: true,
        lead: {
          select: {
            companyName: true,
            contactName: true,
            currency: true,
            expectedCloseDate: true,
            owner: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      budget,
      stage,
      expectedCloseDate,
      companyMission,
      brandValues,
      marketResearchNotes,
      personas = [],
      competitors = [],
      products = [],
      leadId,
    } = body;

    // 1. Session verification & Agency scoping
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId || body.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Agency ID is required to create an opportunity." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Opportunity name is required." },
        { status: 400 }
      );
    }

    // 2. Create Opportunity with relational discovery data nested inside
    const opportunity = await db.opportunity.create({
      data: {
        name: name.trim(),
        budget: budget ? parseFloat(budget) : null,
        stage: stage || OpportunityStage.DISCOVERY,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        companyMission: companyMission || null,
        brandValues: brandValues || null,
        marketResearchNotes: marketResearchNotes || null,
        agencyId,
        ...(leadId ? { leadId } : {}),

        // Nested creation of related array items
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
              price: pr.price !== null && pr.price !== "" ? Number(pr.price) : null,
              usp: pr.usp || null,
              painPoints: pr.painPoints || null,
            })),
        },
      },
      include: {
        personas: true,
        competitors: true,
        products: true,
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/opportunities Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create opportunity" },
      { status: 500 }
    );
  }
}