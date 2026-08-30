// app/api/opportunities/[opportunityId]/creative-brief/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ opportunityId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // ✅ Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Validate the opportunityId parameter
    const { opportunityId } = await params;
    
    if (!opportunityId) {
      return NextResponse.json(
        { success: false, error: "Opportunity ID is required" },
        { status: 400 }
      );
    }

    // ✅ Fetch opportunity with all related data
    const opportunity = await db.opportunity.findFirst({
      where: {
        id: opportunityId,
        agencyId: session.user.agencyId,
      },
      include: {
        client: true,
        lead: true,
        personas: true,
        competitors: true,
        products: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    // ✅ Check if a project already exists for this opportunity
    let project = await db.project.findFirst({
      where: {
        agencyId: opportunity.agencyId,
        clientId: opportunity.clientId ?? undefined,
        name: opportunity.name,
      },
    });

    // ✅ Create a project if it doesn't exist
    if (!project) {
      project = await db.project.create({
        data: {
          name: opportunity.name,
          projectName: opportunity.name,
          agencyId: opportunity.agencyId,
          clientId: opportunity.clientId || "",
          totalValue: opportunity.budget || 0,
          currency: opportunity.currency || "EGP",
          status: "DRAFT",
        },
      });
    }

    // ✅ Check if a brief already exists for this opportunity
    const existingBrief = await db.creativeBrief.findFirst({
      where: {
        projectId: project.id,
      },
    });

    if (existingBrief) {
      return NextResponse.json({
        success: true,
        briefId: existingBrief.id,
        projectId: project.id,
        message: "Brief already exists",
      });
    }

    // ✅ Generate the creative brief from opportunity data
    const brief = await db.creativeBrief.create({
      data: {
        title: `${opportunity.name} - Creative Brief`,
        budget: opportunity.budget,
        objectives: generateObjectives(opportunity),
        audience: generateAudience(opportunity),
        keyMessage: generateKeyMessage(opportunity),
        deliverables: generateDeliverables(opportunity),
        references: generateReferences(opportunity),
        projectId: project.id,
        status: "DRAFT",
      },
    });

    return NextResponse.json({
      success: true,
      briefId: brief.id,
      projectId: project.id,
    });

  } catch (error: any) {
    console.error("[CREATIVE_BRIEF_ERROR]:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Failed to generate creative brief" 
      },
      { status: 500 }
    );
  }
}

// ✅ Helper functions for generating brief content
function generateObjectives(opportunity: any): string {
  const objectives = [
    opportunity.companyMission ? `Mission: ${opportunity.companyMission}` : null,
    opportunity.creativeStrategy ? `Creative Strategy: ${opportunity.creativeStrategy}` : null,
    opportunity.marketingStrategy ? `Marketing Strategy: ${opportunity.marketingStrategy}` : null,
    opportunity.communicationStrategy ? `Communication Strategy: ${opportunity.communicationStrategy}` : null,
    opportunity.mediaStrategy ? `Media Strategy: ${opportunity.mediaStrategy}` : null,
    opportunity.launchStrategy ? `Launch Strategy: ${opportunity.launchStrategy}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (opportunity.kpis?.length) {
    return objectives + `\n\nTarget KPIs:\n${opportunity.kpis.map((kpi: string) => `• ${kpi}`).join("\n")}`;
  }

  return objectives || "Derived from Opportunity Discovery.";
}

function generateAudience(opportunity: any): string {
  const personas = opportunity.personas || [];
  
  if (personas.length > 0) {
    return personas
      .map(
        (p: any) =>
          `• **${p.name}**\n  - Demographics: ${p.demographics || "N/A"}\n  - Psychographics: ${p.psychographics || "N/A"}\n  - Goals: ${p.goals || "N/A"}\n  - Frustrations: ${p.frustrations || "N/A"}`
      )
      .join("\n\n");
  }

  if (opportunity.lead?.contactName) {
    return `Target audience: ${opportunity.lead.contactName} and similar decision-makers in the ${opportunity.lead.industry || "relevant"} industry.`;
  }

  return "No specific personas defined yet. Define target audience based on opportunity context.";
}

function generateKeyMessage(opportunity: any): string {
  const messages = [];

  if (opportunity.brandValues) {
    messages.push(`Brand Values: ${opportunity.brandValues}`);
  }

  if (opportunity.creativeStrategy) {
    messages.push(`Creative Strategy: ${opportunity.creativeStrategy}`);
  }

  if (opportunity.communicationStrategy) {
    messages.push(`Communication Strategy: ${opportunity.communicationStrategy}`);
  }

  if (opportunity.products?.length > 0) {
    const productNames = opportunity.products.map((p: any) => p.name).join(", ");
    messages.push(`Key Products/Services: ${productNames}`);
  }

  return messages.length > 0
    ? messages.join("\n\n")
    : "Define key messaging based on brand values and opportunity goals.";
}

function generateDeliverables(opportunity: any): string[] {
  const deliverables = ["Creative Brief Document"];

  if (opportunity.products?.length > 0) {
    deliverables.push("Product/Service Messaging Framework");
  }

  if (opportunity.competitors?.length > 0) {
    deliverables.push("Competitive Analysis Summary");
  }

  if (opportunity.personas?.length > 0) {
    deliverables.push("Target Audience Persona Profiles");
  }

  if (opportunity.creativeStrategy) {
    deliverables.push("Creative Strategy Execution Plan");
  }

  return deliverables;
}

function generateReferences(opportunity: any): string[] {
  const references = [];

  if (opportunity.lead?.contactName) {
    references.push(`Lead Contact: ${opportunity.lead.contactName} (${opportunity.lead.contactEmail || "Email not provided"})`);
  }

  if (opportunity.lead?.companyName) {
    references.push(`Company: ${opportunity.lead.companyName}`);
  }

  if (opportunity.client?.clientName) {
    references.push(`Client: ${opportunity.client.clientName} (${opportunity.client.email || "Email not provided"})`);
  }

  if (opportunity.marketResearchNotes) {
    references.push(`Market Research Notes: ${opportunity.marketResearchNotes.substring(0, 200)}...`);
  }

  if (opportunity.expectedCloseDate) {
    references.push(`Expected Close Date: ${new Date(opportunity.expectedCloseDate).toLocaleDateString()}`);
  }

  return references;
}