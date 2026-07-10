import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

const DEFAULT_AGENCY_ID = "cmqv7pkzo0000xmkk0u7229sf";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type PatchClientBody = {
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
  creditLimit?: number | string | null;
  isOnCreditHold?: boolean;
  creditHoldReason?: string;
  creditLimitAlertPct?: number | string;
  primaryContactId?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
};

const clean = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const numberOrNull = (value: unknown) => {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

async function getRouteId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

async function getAgencyId(req: Request, bodyAgencyId?: string) {
  const session = await getServerSession(authOptions).catch(() => null);
  const sessionAgencyId = session?.user?.agencyId;

  if (sessionAgencyId) return sessionAgencyId;

  const headerAgencyId = clean(req.headers.get("x-agency-id"));
  if (headerAgencyId) return headerAgencyId;

  const url = new URL(req.url);
  return clean(url.searchParams.get("agencyId")) ?? clean(bodyAgencyId) ?? DEFAULT_AGENCY_ID;
}

const formatClient = (client: any) => {
  const totalProjectValue = client.projects.reduce(
    (sum: number, project: any) => sum + (project.totalValue || 0),
    0
  );
  const totalInvoiced = client.clientInvoices.reduce(
    (sum: number, invoice: any) => sum + (invoice.totalAmount || 0),
    0
  );
  const totalPaid = client.payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  const unappliedCredit = client.payments.reduce(
    (sum: number, payment: any) => sum + (payment.unappliedAmount || 0),
    0
  );
  const totalDue = Math.max(
    client.clientInvoices.reduce((sum: number, invoice: any) => {
      const calculatedBalance = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
      return sum + Math.max(invoice.balanceDue ?? calculatedBalance, 0);
    }, 0) - unappliedCredit,
    client.outstandingBalance || 0,
    0
  );

  const invoices = client.clientInvoices.map((invoice: any) => {
    const invoicePayments = client.payments.filter((payment: any) => payment.invoiceId === invoice.id);
    const projectPayments = invoice.projectId
      ? client.payments.filter((payment: any) => payment.projectId === invoice.projectId)
      : [];
    const paidFromPayments = [...invoicePayments, ...projectPayments].reduce(
      (sum: number, payment: any) => sum + (payment.amount || 0),
      0
    );
    const amountPaid = Math.max(invoice.amountPaid || 0, paidFromPayments);

    return {
      ...invoice,
      amountPaid,
      balanceDue: Math.max((invoice.totalAmount || 0) - amountPaid, invoice.balanceDue || 0, 0),
    };
  });

  return {
    ...client,
    primaryContact: client.contacts.find((contact: any) => contact.isPrimary) ?? client.contacts[0] ?? null,
    activeBudget: client.clientBudgets[0] ?? null,
    latestStatement: client.statements[0] ?? null,
    invoices,
    totals: {
      totalProjectValue,
      totalInvoiced,
      totalPaid,
      totalDue,
      unappliedCredit,
      projectCount: client.projects.length,
      invoiceCount: client.clientInvoices.length,
      paymentCount: client.payments.length,
    },
  };
};

export async function GET(req: Request, context: RouteContext) {
  const id = await getRouteId(context);
  const agencyId = await getAgencyId(req);

  try {
    const client = await prisma.client.findFirst({
      where: {
        id,
        agencyId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        clientBudgets: {
          where: { isActive: true },
          orderBy: { periodEnd: "desc" },
        },
        projects: {
          where: {
            OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
          },
          select: {
            id: true,
            projectNo: true,
            projectName: true,
            status: true,
            totalValue: true,
            currency: true,
            invoiceNo: true,
            invoiceStatus: true,
            targetDeadline: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        clientInvoices: {
          where: { status: { not: "VOID" } },
          select: {
            id: true,
            invoiceNo: true,
            type: true,
            status: true,
            subtotal: true,
            taxAmount: true,
            discount: true,
            totalAmount: true,
            amountPaid: true,
            balanceDue: true,
            currency: true,
            issuedAt: true,
            dueDate: true,
            paidAt: true,
            projectId: true,
            notes: true,
          },
          orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
        },
        payments: {
          where: { status: "COMPLETED" },
          select: {
            id: true,
            paymentNo: true,
            amount: true,
            unappliedAmount: true,
            currency: true,
            method: true,
            status: true,
            datePaid: true,
            description: true,
            referenceNo: true,
            projectId: true,
            invoiceId: true,
          },
          orderBy: { datePaid: "desc" },
        },
        statements: {
          orderBy: { periodEnd: "desc" },
          take: 5,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found in your workspace" }, { status: 404 });
    }

    return NextResponse.json(formatClient(client));
  } catch (error: any) {
    console.error("GET_CLIENT_DETAIL_ERROR:", error?.message);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const id = await getRouteId(context);
  const body = (await req.json()) as PatchClientBody;
  const agencyId = await getAgencyId(req, body.agencyId);

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        agencyId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      select: { id: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found in your workspace" }, { status: 404 });
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

    const creditLimit = numberOrNull(body.creditLimit);
    const creditLimitAlertPct = numberOrNull(body.creditLimitAlertPct);

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        clientName: clean(body.clientName),
        accountType: clean(body.accountType),
        status: clean(body.status),
        relationshipType: body.relationshipType,
        email: clean(body.email),
        phoneNumber: clean(body.phoneNumber),
        website: clean(body.website),
        notes: clean(body.notes),
        billingAddress: hasBillingAddress ? billingAddress : undefined,
        creditLimit,
        isOnCreditHold: body.isOnCreditHold,
        creditHoldReason: body.isOnCreditHold ? clean(body.creditHoldReason) : null,
        creditLimitAlertPct,
      },
    });

    if (clean(body.contactName)) {
      if (body.primaryContactId) {
        await prisma.clientContact.update({
          where: { id: body.primaryContactId },
          data: {
            name: clean(body.contactName)!,
            title: clean(body.contactTitle),
            email: clean(body.contactEmail),
            phoneNumber: clean(body.contactPhone),
            isPrimary: true,
          },
        });
      } else {
        await prisma.clientContact.create({
          data: {
            name: clean(body.contactName)!,
            title: clean(body.contactTitle),
            email: clean(body.contactEmail),
            phoneNumber: clean(body.contactPhone),
            isPrimary: true,
            clientId: id,
            agencyId,
          },
        });
      }
    }

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("PATCH_CLIENT_ERROR:", error?.message);
    return NextResponse.json({ error: "Modification failed" }, { status: 500 });
  }
}
