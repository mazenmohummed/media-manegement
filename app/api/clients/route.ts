import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

type CreateClientBody = {
  agencyId?: string;
  clientName?: string;
  accountType?: string;
  status?: string;
  relationshipType?: "ONE_TIME" | "RECURRING";
  email?: string;
  phoneNumber?: string;
  website?: string;
  notes?: string;
  billingLine1?: string;
  billingLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  creditLimit?: number | string;
  isOnCreditHold?: boolean;
  creditHoldReason?: string;
  creditLimitAlertPct?: number | string;
  budgetAmount?: number | string;
  budgetPeriodStart?: string;
  budgetPeriodEnd?: string;
  currency?: string;
};

const clean = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const money = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const nextClientNo = async (agencyId: string) => {
  const clientCount = await prisma.client.count({ where: { agencyId } });
  return `CLI-${String(clientCount + 1).padStart(5, "0")}`;
};

export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      where: {
        agencyId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      select: {
        id: true,
        clientNo: true,
        clientName: true,
        accountType: true,
        status: true,
        relationshipType: true,
        email: true,
        phoneNumber: true,
        website: true,
        notes: true,
        billingAddress: true,
        creditLimit: true,
        outstandingBalance: true,
        isOnCreditHold: true,
        creditHoldReason: true,
        creditLimitAlertPct: true,
        createdAt: true,
        contacts: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true,
            phoneNumber: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
        },
        projects: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
        clientInvoices: {
          where: { status: { not: "VOID" } },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            amountPaid: true,
            balanceDue: true,
            dueDate: true,
          },
        },
        payments: {
          where: { status: "COMPLETED" },
          select: {
            amount: true,
            unappliedAmount: true,
          },
        },
        clientBudgets: {
          where: { isActive: true },
          select: {
            totalAmount: true,
            spentAmount: true,
            remainingAmount: true,
            currency: true,
            periodStart: true,
            periodEnd: true,
          },
          orderBy: { periodEnd: "desc" },
          take: 1,
        },
        statements: {
          where: { status: "ISSUED" },
          select: {
            id: true,
            statementNo: true,
            periodEnd: true,
            closingBalance: true,
          },
          orderBy: { periodEnd: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date();
    const openProjectStatuses = ["DRAFT", "ACTIVE", "ON_HOLD"];

    const rows = clients.map((client) => {
      const totalInvoiced = client.clientInvoices.reduce(
        (sum, invoice) => sum + (invoice.totalAmount || 0),
        0
      );
      const totalReceived = client.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const unappliedCredit = client.payments.reduce(
        (sum, payment) => sum + (payment.unappliedAmount || 0),
        0
      );
      const totalDueFromInvoices = client.clientInvoices.reduce((sum, invoice) => {
        const calculatedBalance = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
        return sum + Math.max(invoice.balanceDue ?? calculatedBalance, 0);
      }, 0);
      const overdueAmount = client.clientInvoices.reduce((sum, invoice) => {
        if (!invoice.dueDate || invoice.status === "PAID" || invoice.dueDate >= today) return sum;
        return sum + Math.max(invoice.balanceDue || 0, 0);
      }, 0);
      const activeBudget = client.clientBudgets[0] ?? null;
      const primaryContact = client.contacts[0] ?? null;

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
        notes: client.notes,
        billingAddress: client.billingAddress,
        creditLimit: client.creditLimit,
        outstandingBalance: client.outstandingBalance,
        isOnCreditHold: client.isOnCreditHold,
        creditHoldReason: client.creditHoldReason,
        creditLimitAlertPct: client.creditLimitAlertPct,
        createdAt: client.createdAt,
        primaryContact,
        projectCount: client.projects.length,
        openProjects: client.projects.filter((project) => openProjectStatuses.includes(project.status)).length,
        invoiceCount: client.clientInvoices.length,
        totalInvoiced,
        totalReceived,
        totalDue: Math.max(totalDueFromInvoices - unappliedCredit, client.outstandingBalance || 0, 0),
        overdueAmount,
        unappliedCredit,
        activeBudget,
        latestStatement: client.statements[0] ?? null,
      };
    });

    return NextResponse.json({ clients: rows });
  } catch (error) {
    console.error("GET_CLIENTS_ERROR:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions).catch(() => null);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as CreateClientBody;
    const clientName = clean(body.clientName);
    const accountType = clean(body.accountType);
    const currency = clean(body.currency) ?? "EGP";
    const budgetAmount = money(body.budgetAmount);
    const creditLimit = money(body.creditLimit);
    const creditLimitAlertPct = money(body.creditLimitAlertPct) ?? 90;

    if (!clientName || !accountType) {
      return NextResponse.json({ error: "Client name and account type are required" }, { status: 400 });
    }

    const billingAddress = {
      line1: clean(body.billingLine1),
      line2: clean(body.billingLine2),
      city: clean(body.billingCity),
      state: clean(body.billingState),
      postalCode: clean(body.billingPostalCode),
      country: clean(body.billingCountry),
    };
    const hasBillingAddress = Object.values(billingAddress).some(Boolean);

    const client = await prisma.client.create({
      data: {
        clientNo: await nextClientNo(agencyId),
        clientName,
        accountType,
        status: clean(body.status) ?? "ACTIVE",
        relationshipType: body.relationshipType ?? "ONE_TIME",
        email: clean(body.email),
        phoneNumber: clean(body.phoneNumber),
        website: clean(body.website),
        notes: clean(body.notes),
        billingAddress: hasBillingAddress ? billingAddress : undefined,
        creditLimit,
        creditLimitAlertPct,
        isOnCreditHold: Boolean(body.isOnCreditHold),
        creditHoldReason: Boolean(body.isOnCreditHold) ? clean(body.creditHoldReason) : undefined,
        outstandingBalance: 0,
        agencyId,
        contacts: clean(body.contactName)
          ? {
              create: {
                name: clean(body.contactName)!,
                title: clean(body.contactTitle),
                email: clean(body.contactEmail),
                phoneNumber: clean(body.contactPhone),
                isPrimary: true,
                agencyId,
              },
            }
          : undefined,
        clientBudgets:
          budgetAmount !== undefined && body.budgetPeriodStart && body.budgetPeriodEnd
            ? {
                create: {
                  totalAmount: budgetAmount,
                  spentAmount: 0,
                  remainingAmount: budgetAmount,
                  currency,
                  periodStart: new Date(body.budgetPeriodStart),
                  periodEnd: new Date(body.budgetPeriodEnd),
                  agencyId,
                },
              }
            : undefined,
      },
      include: {
        contacts: { take: 1 },
        clientBudgets: { where: { isActive: true }, take: 1 },
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_CLIENT_ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to create client",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}