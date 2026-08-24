// app/api/opportunities/[opportunityId]/creative-brief/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> }
) {
  try {
    const { opportunityId } = await params;

    // 1. Fetch opportunity discovery data & personas[cite: 1]
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        personas: true,
        client: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    // 2. Compile pre-filled objectives & audience text from personas[cite: 1]
    const compiledObjectives = [
      opportunity.companyMission ? `Mission: ${opportunity.companyMission}` : null,
      opportunity.creativeStrategy ? `Creative Strategy: ${opportunity.creativeStrategy}` : null,
      opportunity.marketingStrategy ? `Marketing Strategy: ${opportunity.marketingStrategy}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || "Derived from Opportunity Discovery.";

    const compiledAudience = opportunity.personas
      .map(
        (p) =>
          `• **${p.name}**\n  - Demographics: ${p.demographics || "N/A"}\n  - Goals: ${p.goals || "N/A"}\n  - Frustrations: ${p.frustrations || "N/A"}`
      )
      .join("\n\n") || "No specific personas defined yet.";

    // 3. Ensure a Project exists for this opportunity to hold the Creative Brief[cite: 1]
    let project = await db.project.findFirst({
      where: { 
        agencyId: opportunity.agencyId,
        clientId: opportunity.clientId ?? undefined,
        name: opportunity.name 
      },
    });

    if (!project) {
      project = await db.project.create({
        data: {
          name: opportunity.name,
          projectName: opportunity.name,
          agencyId: opportunity.agencyId,
          clientId: opportunity.clientId || "", 
          totalValue: opportunity.budget || 0,
          currency: opportunity.currency,
        },
      });
    }

    // 4. Create the Creative Brief pre-filled from opportunity insights[cite: 1]
    const brief = await db.creativeBrief.create({
      data: {
        title: `${opportunity.name} - Creative Brief`,
        budget: opportunity.budget,
        objectives: compiledObjectives,
        audience: compiledAudience,
        keyMessage: opportunity.brandValues || null,
        deliverables: [],
        references: opportunity.marketResearchNotes ? [opportunity.marketResearchNotes] : [],
        projectId: project.id,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ success: true, briefId: brief.id, projectId: project.id });
  } catch (error) {
    console.error("Failed to create creative brief from opportunity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate creative brief." },
      { status: 500 }
    );
  }
}