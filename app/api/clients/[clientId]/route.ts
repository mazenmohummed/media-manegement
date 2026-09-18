// app/api/clients/[clientId]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// ✅ Use the actual param name from the folder: clientId
type RouteContext = {
  params: Promise<{ clientId: string }>;
};

type PatchClientBody = {
  clientName?: string;
  accountType?: string;
  status?: string;
  relationshipType?: 'ONE_TIME' | 'RECURRING';
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
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

async function getRouteId(context: RouteContext) {
  const params = await context.params;
  return params.clientId; // ✅ Use clientId
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
  const totalPaid = client.payments.reduce(
    (sum: number, payment: any) => sum + (payment.amount || 0),
    0
  );
  const unappliedCredit = client.payments.reduce(
    (sum: number, payment: any) => sum + (payment.unappliedAmount || 0),
    0
  );
  const totalDue = Math.max(
    client.clientInvoices.reduce((sum: number, invoice: any) => {
      const calculatedBalance =
        (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
      return sum + Math.max(invoice.balanceDue ?? calculatedBalance, 0);
    }, 0) - unappliedCredit,
    client.outstandingBalance || 0,
    0
  );

  const invoices = client.clientInvoices.map((invoice: any) => {
    const invoicePayments = client.payments.filter(
      (payment: any) => payment.invoiceId === invoice.id
    );
    const projectPayments = invoice.projectId
      ? client.payments.filter(
          (payment: any) => payment.projectId === invoice.projectId
        )
      : [];
    const paidFromPayments = [...invoicePayments, ...projectPayments].reduce(
      (sum: number, payment: any) => sum + (payment.amount || 0),
      0
    );
    const amountPaid = Math.max(invoice.amountPaid || 0, paidFromPayments);

    return {
      ...invoice,
      amountPaid,
      balanceDue: Math.max(
        (invoice.totalAmount || 0) - amountPaid,
        invoice.balanceDue || 0,
        0
      ),
    };
  });

  return {
    ...client,
    primaryContact:
      client.contacts.find((contact: any) => contact.isPrimary) ??
      client.contacts[0] ??
      null,
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

// ─── GET ────────────────────────────────────────────────────────────────

export async function GET(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions).catch(() => null);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = await getRouteId(context);

  try {
    const client = await prisma.client.findFirst({
      where: {
        id,
        agencyId,
        // ✅ Fixed: `deletedAt` accepts Date | null, not { isSet }
        deletedAt: null,
      },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        clientBudgets: {
          where: { isActive: true },
          orderBy: { periodEnd: 'desc' },
        },
        projects: {
          // ✅ Fixed: `deletedAt: null` only
          where: { deletedAt: null },
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
          orderBy: { createdAt: 'desc' },
        },
        clientInvoices: {
          where: { status: { not: 'VOID' } },
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
          orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
        },
        payments: {
          where: { status: 'COMPLETED' },
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
          orderBy: { datePaid: 'desc' },
        },
        statements: {
          orderBy: { periodEnd: 'desc' },
          take: 5,
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found in your workspace' },
        { status: 404 }
      );
    }

    return NextResponse.json(formatClient(client));
  } catch (error: any) {
    console.error('GET_CLIENT_DETAIL_ERROR:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions).catch(() => null);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = await getRouteId(context);
  const body = (await req.json()) as PatchClientBody;

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        agencyId,
        deletedAt: null, // ✅ Fixed
      },
      select: { id: true },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found in your workspace' },
        { status: 404 }
      );
    }

    // ✅ Build only the billing address fields that are actually set
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

    // ✅ Safe email normalization (handle undefined)
    const normalizedEmail = body.email
      ? clean(body.email.toLowerCase().trim())
      : undefined;

    // ✅ Build the billing address relation input
    // If the client already has a billing address, use `upsert`
    // Otherwise, `create`
    let billingAddressInput:
      | { upsert: { create: any; update: any } }
      | undefined = undefined;

    if (hasBillingAddress) {
      billingAddressInput = {
        upsert: {
          create: billingAddress,
          update: billingAddress,
        },
      };
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        clientName: clean(body.clientName),
        accountType: clean(body.accountType),
        status: clean(body.status),
        relationshipType: body.relationshipType,
        email: normalizedEmail,
        phoneNumber: clean(body.phoneNumber),
        website: clean(body.website),
        notes: clean(body.notes),
        billingAddress: billingAddressInput,
        creditLimit,
        isOnCreditHold: body.isOnCreditHold,
        creditHoldReason: body.isOnCreditHold
          ? clean(body.creditHoldReason) ?? null
          : null,
        creditLimitAlertPct,
      },
    });

    // ─── Contact upsert ──────────────────────────────────────────────
    if (clean(body.contactName)) {
      // ✅ Safe email normalization for the contact
      const normalizedContactEmail = body.contactEmail
        ? clean(body.contactEmail.toLowerCase().trim())
        : undefined;

      if (body.primaryContactId) {
        await prisma.clientContact.update({
          where: { id: body.primaryContactId },
          data: {
            name: clean(body.contactName)!,
            title: clean(body.contactTitle),
            email: normalizedContactEmail,
            phoneNumber: clean(body.contactPhone),
            isPrimary: true,
          },
        });
      } else {
        await prisma.clientContact.create({
          data: {
            name: clean(body.contactName)!,
            title: clean(body.contactTitle),
            email: normalizedContactEmail,
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
    console.error('PATCH_CLIENT_ERROR:', error?.message);
    return NextResponse.json(
      { error: 'Modification failed' },
      { status: 500 }
    );
  }
}