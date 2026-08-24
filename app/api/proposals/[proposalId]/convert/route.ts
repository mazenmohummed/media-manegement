import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  ContractStatus,
  ProjectStatus,
  BriefStatus,
} from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { proposalId } = await params;
  const agencyId = session.user.agencyId;

  const proposal = await db.proposal.findUnique({
    where: { id: proposalId },
    include: {
      opportunity: {
        include: {
          personas: true,
          competitors: true,
          products: true,
        },
      },
      client: true,
    },
  });

  if (!proposal || proposal.agencyId !== agencyId) {
    return NextResponse.json(
      { error: "Proposal not found or unauthorized" },
      { status: 404 }
    );
  }

  if (proposal.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Proposal must be accepted before conversion" },
      { status: 400 }
    );
  }

  if (proposal.contractId) {
    return NextResponse.json(
      { error: "Proposal already converted to a contract" },
      { status: 409 }
    );
  }

  // Guard: clientId is required for Contract and Project
  if (!proposal.clientId) {
    return NextResponse.json(
      { error: "Proposal must have a linked client before conversion" },
      { status: 400 }
    );
  }

  const clientId = proposal.clientId; // now string, not string | null

  // 1. Create Contract
  const contract = await db.contract.create({
    data: {
      name: `${proposal.opportunity?.name || "Project"} — Contract`,
      contractNo: proposal.proposalNo
        ? `CNT-${proposal.proposalNo}`
        : `CNT-${Date.now()}`,
      status: ContractStatus.ACTIVE,
      clientId, // string
      agencyId: proposal.agencyId,
      userId: proposal.userId ?? undefined,
      monthlyValue: proposal.totalAmount,
      currency: proposal.currency,
      startDate: new Date(),
      termsUrl: null,
    },
  });

  // 2. Link proposal → contract
  await db.proposal.update({
    where: { id: proposalId },
    data: { contractId: contract.id },
  });

  // 3. Spin up Project
  const project = await db.project.create({
    data: {
      name: proposal.opportunity?.name || contract.name,
      projectName: proposal.opportunity?.name || contract.name,
      projectNo: `PRJ-${contract.contractNo}`,
      status: ProjectStatus.ACTIVE,
      clientId, // string
      agencyId: proposal.agencyId,
      contractId: contract.id,
      totalValue: proposal.totalAmount,
      currency: proposal.currency,
      targetDeadline: proposal.opportunity?.expectedCloseDate ?? null,
    },
  });

  // 4. Auto-generate CreativeBrief from Opportunity discovery data
  const opp = proposal.opportunity;
  if (opp) {
    const objectivesParts: (string | null)[] = [
      opp.companyMission ? `Mission: ${opp.companyMission}` : null,
      opp.marketingStrategy
        ? `Marketing Strategy: ${opp.marketingStrategy}`
        : null,
      opp.launchStrategy ? `Launch Strategy: ${opp.launchStrategy}` : null,
      opp.kpis?.length
        ? `KPIs:\n${opp.kpis.map((k) => `• ${k}`).join("\n")}`
        : null,
    ];
    const objectives = objectivesParts.filter(Boolean).join("\n\n") || "TBD";

    const audienceParts: (string | null)[] = [
      ...(opp.personas?.map((p) => {
        const parts = [`${p.name}`];
        if (p.demographics) parts.push(`Demographics: ${p.demographics}`);
        if (p.psychographics)
          parts.push(`Psychographics: ${p.psychographics}`);
        if (p.buyingBehavior) parts.push(`Behavior: ${p.buyingBehavior}`);
        if (p.goals) parts.push(`Goals: ${p.goals}`);
        if (p.frustrations) parts.push(`Pain Points: ${p.frustrations}`);
        return parts.join(" | ");
      }) ?? []),
      opp.marketResearchNotes
        ? `Research: ${opp.marketResearchNotes}`
        : null,
    ];
    const audience = audienceParts.filter(Boolean).join("\n\n") || "TBD";

    const keyMessage =
      opp.brandValues ||
      opp.communicationStrategy ||
      opp.creativeStrategy ||
      "TBD";

    const deliverables =
      opp.products?.map((p) => {
        const parts = [p.name];
        if (p.usp) parts.push(`USP: ${p.usp}`);
        return parts.join(" — ");
      }) ?? [];

    const references =
      opp.competitors?.map((c) => {
        const parts = [c.name];
        if (c.strengths) parts.push(`Strengths: ${c.strengths}`);
        if (c.weaknesses) parts.push(`Weaknesses: ${c.weaknesses}`);
        return parts.join(" | ");
      }) ?? [];

    await db.creativeBrief.create({
      data: {
        title: `Creative Brief — ${project.projectName}`,
        status: BriefStatus.DRAFT,
        budget: opp.budget || proposal.totalAmount,
        objectives,
        audience,
        keyMessage,
        deliverables: deliverables.length > 0 ? deliverables : [],
        references: references.length > 0 ? references : [],
        projectId: project.id,
      },
    });
  }

  return NextResponse.json({ projectId: project.id }, { status: 201 });
}