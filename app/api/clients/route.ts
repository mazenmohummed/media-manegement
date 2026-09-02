import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId =
      searchParams.get("agencyId") || request.headers.get("x-agency-id");

    if (!agencyId) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    // ✅ Verify agency exists with better error handling
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, agencyName: true },
    });

    if (!agency) {
      console.warn(`[GET /api/clients] Agency not found: ${agencyId}`);
      // ✅ Return empty array instead of 404 to avoid breaking the UI
      return NextResponse.json({ 
        clients: [], 
        error: "Agency not found. Please create an agency first." 
      }, { status: 404 });
    }

    const clients = await prisma.client.findMany({
      where: { agencyId, deletedAt: null },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
        projects: {
          select: { id: true, status: true },
        },
        clientInvoices: {
          select: { totalAmount: true, amountPaid: true, balanceDue: true },
        },
        clientBudgets: {
          where: { isActive: true },
          take: 1,
        },
        statements: {
          orderBy: { periodEnd: "desc" },
          take: 1,
        },
        opportunities: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedClients = clients.map((client) => {
      const primaryContact = client.contacts[0] || null;
      const projectCount = client.projects.length;
      const openProjects = client.projects.filter(
        (p) => p.status === "ACTIVE"
      ).length;
      const invoiceCount = client.clientInvoices.length;

      const totalInvoiced = client.clientInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0
      );
      const totalReceived = client.clientInvoices.reduce(
        (sum, inv) => sum + inv.amountPaid,
        0
      );
      const totalDue = client.clientInvoices.reduce(
        (sum, inv) => sum + inv.balanceDue,
        0
      );

      const activeBudget = client.clientBudgets[0]
        ? {
            totalAmount: client.clientBudgets[0].totalAmount,
            spentAmount: client.clientBudgets[0].spentAmount,
            remainingAmount: client.clientBudgets[0].remainingAmount,
            currency: client.clientBudgets[0].currency,
            periodEnd: client.clientBudgets[0].periodEnd.toISOString(),
          }
        : null;

      const latestStatement = client.statements[0]
        ? {
            id: client.statements[0].id,
            statementNo: client.statements[0].statementNo,
            periodEnd: client.statements[0].periodEnd.toISOString(),
            closingBalance: client.statements[0].closingBalance,
          }
        : null;

      return {
        id: client.id,
        clientNo: client.clientNo,
        clientName: client.clientName,
        accountType: client.accountType,
        status: client.status,
        relationshipType: client.relationshipType,
        email: client.email,
        phoneNumber: client.phoneNumber,
        website: client.website,
        creditLimit: client.creditLimit,
        outstandingBalance: client.outstandingBalance,
        isOnCreditHold: client.isOnCreditHold,
        createdAt: client.createdAt.toISOString(),
        primaryContact: primaryContact
          ? {
              name: primaryContact.name,
              title: primaryContact.title,
              email: primaryContact.email,
              phoneNumber: primaryContact.phoneNumber,
            }
          : null,
        projectCount,
        openProjects,
        invoiceCount,
        totalInvoiced,
        totalReceived,
        totalDue,
        overdueAmount: 0,
        unappliedCredit: 0,
        activeBudget,
        latestStatement,
        opportunities: client.opportunities,
      };
    });

    return NextResponse.json({ clients: formattedClients });
  } catch (error: any) {
    console.error("[GET /api/clients Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const headerAgencyId = request.headers.get("x-agency-id");
    
    // Resolve agencyId safely from session, body, or headers
    const agencyId = session?.user?.agencyId || body.agencyId || headerAgencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    // ✅ Verify agency exists before proceeding
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, agencyName: true },
    });

    if (!agency) {
      return NextResponse.json(
        { error: "Agency not found. Please create an agency first." },
        { status: 404 }
      );
    }

    const {
      // Basic / Expanded fields
      clientName,
      name,
      companyName,
      accountType,
      status,
      relationshipType,
      email,
      phone,
      phoneNumber,
      website,
      notes,
      billingLine1,
      billingCity,
      billingCountry,
      contactName,
      contactTitle,
      contactEmail,
      contactPhone,
      creditLimit,
      isOnCreditHold,
      creditHoldReason,
      creditLimitAlertPct,
      budgetAmount,
      budgetPeriodStart,
      budgetPeriodEnd,
      currency,
      opportunityId,
      // User Credentials
      createUser = true,
      userName,
      userEmail,
      userPassword,
    } = body;

    const resolvedClientName = clientName || name || companyName;

    if (!resolvedClientName) {
      return NextResponse.json(
        { error: "Client name or company name is required" },
        { status: 400 }
      );
    }

    const resolvedEmail = email || phone;
    const resolvedPhone = phoneNumber || phone;

    // Determine credentials for the associated portal User
    const portalEmail = userEmail || contactEmail || resolvedEmail;
    const portalName = userName || contactName || `${resolvedClientName} Admin`;

    // Execute transaction to ensure atomic creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Client with direct agency connection
      const newClient = await tx.client.create({
        data: {
          clientName: resolvedClientName,
          accountType,
          status: status || "ACTIVE",
          relationshipType: relationshipType || "ONE_TIME",
          email: resolvedEmail ? resolvedEmail.trim() : null,
          phoneNumber: resolvedPhone ? resolvedPhone.trim() : null,
          website,
          notes,
          creditLimit: creditLimit ? Number(creditLimit) : null,
          isOnCreditHold: Boolean(isOnCreditHold),
          creditHoldReason,
          creditLimitAlertPct: creditLimitAlertPct
            ? Number(creditLimitAlertPct)
            : 90,
          agencyId: agencyId,
          ...(billingLine1 || billingCity || billingCountry
            ? {
                billingAddress: {
                  create: {
                    line1: billingLine1,
                    city: billingCity,
                    country: billingCountry,
                  },
                },
              }
            : {}),
          ...(opportunityId
            ? {
                opportunities: {
                  connect: { id: opportunityId },
                },
              }
            : {}),
        },
        include: {
          opportunities: true,
          billingAddress: true,
        },
      });

      // 2. Create Primary Contact if provided
      if (contactName) {
        await tx.clientContact.create({
          data: {
            name: contactName,
            title: contactTitle,
            email: contactEmail ? contactEmail.toLowerCase().trim() : null,
            phoneNumber: contactPhone,
            isPrimary: true,
            clientId: newClient.id,
            agencyId: agencyId,
          },
        });
      }

      // 3. Create Client Budget if provided
      if (budgetAmount && Number(budgetAmount) > 0) {
        await tx.clientBudget.create({
          data: {
            totalAmount: Number(budgetAmount),
            remainingAmount: Number(budgetAmount),
            spentAmount: 0,
            currency: currency || "EGP",
            periodStart: budgetPeriodStart
              ? new Date(budgetPeriodStart)
              : new Date(),
            periodEnd: budgetPeriodEnd
              ? new Date(budgetPeriodEnd)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
            clientId: newClient.id,
            agencyId: agencyId,
          },
        });
      }

      // 4. Create User with CLIENT role linked to this client
      let newUser = null;
      if (createUser && portalEmail) {
        const defaultPassword = userPassword || "Client@123456";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        newUser = await tx.user.create({
          data: {
            name: portalName,
            email: portalEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: "CLIENT",
            userType: "FULL_TIME",
            agencyId: agencyId,
            clientId: newClient.id,
          },
        });
      }

      return { client: newClient, user: newUser };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A user or record with this email already exists." },
        { status: 400 }
      );
    }
    console.error("[POST /api/clients Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create client" },
      { status: 500 }
    );
  }
}