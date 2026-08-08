// lib/validations/opportunity.ts
import { z } from "zod";
import { OpportunityStage, UserRole } from "@prisma/client";

// ── Discovery Item Schemas ───────────────────────────────────────────

export const discoveryPersonaSchema = z.object({
  name: z.string().min(1, "Persona name is required"),
  demographics: z.string().optional().nullable(),
  psychographics: z.string().optional().nullable(),
  buyingBehavior: z.string().optional().nullable(),
  goals: z.string().optional().nullable(),
  frustrations: z.string().optional().nullable(),
});

export const discoveryCompetitorSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  strengths: z.string().optional().nullable(),
  weaknesses: z.string().optional().nullable(),
  pricingNote: z.string().optional().nullable(),
  marketShare: z.string().optional().nullable(),
});

export const discoveryProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  usp: z.string().optional().nullable(),
  painPoints: z.string().optional().nullable(),
});

// ── Opportunity Schemas ──────────────────────────────────────────────

export const opportunityStageSchema = z.nativeEnum(OpportunityStage);

export const opportunityBaseSchema = z.object({
  name: z
    .string()
    .min(1, "Opportunity name is required")
    .max(255, "Name must be under 255 characters"),

  stage: opportunityStageSchema.default(OpportunityStage.DISCOVERY),

  budget: z.coerce
    .number()
    .nonnegative("Budget cannot be negative")
    .optional()
    .nullable(),

  currency: z.string().max(3).default("EGP"),

  expectedCloseDate: z.coerce
    .date()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val > new Date(),
      "Expected close date must be in the future"
    ),

  // Strategic fields
  companyMission: z.string().optional().nullable(),
  brandValues: z.string().optional().nullable(),
  marketResearchNotes: z.string().optional().nullable(),
  marketingStrategy: z.string().optional().nullable(),
  communicationStrategy: z.string().optional().nullable(),
  mediaStrategy: z.string().optional().nullable(),
  creativeStrategy: z.string().optional().nullable(),
  launchStrategy: z.string().optional().nullable(),

  kpis: z.array(z.string().min(1)).default([]),

  // Relations
  leadId: z.string().cuid().optional().nullable(),
  clientId: z.string().cuid().min(1, "Opportunity owner (client) is required"),
  userId: z.string().cuid().optional().nullable(),

  // Discovery arrays (for nested create)
  personas: z.array(discoveryPersonaSchema).default([]),
  competitors: z.array(discoveryCompetitorSchema).default([]),
  products: z.array(discoveryProductSchema).default([]),
});

// Schema for creating a new opportunity (strict)
export const createOpportunitySchema = opportunityBaseSchema;

// Schema for updating (all fields optional)
export const updateOpportunitySchema = opportunityBaseSchema.partial();

// Schema specifically for the PATCH endpoint body
export const opportunityPatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  stage: opportunityStageSchema.optional(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().max(3).optional(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  companyMission: z.string().optional().nullable(),
  brandValues: z.string().optional().nullable(),
  marketResearchNotes: z.string().optional().nullable(),
  marketingStrategy: z.string().optional().nullable(),
  communicationStrategy: z.string().optional().nullable(),
  mediaStrategy: z.string().optional().nullable(),
  creativeStrategy: z.string().optional().nullable(),
  launchStrategy: z.string().optional().nullable(),
  kpis: z.array(z.string().min(1)).optional(),
  userId: z.string().cuid().optional().nullable(),
  clientId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional().nullable(),
});

// ── Type Exports ─────────────────────────────────────────────────────

export type DiscoveryPersonaInput = z.infer<typeof discoveryPersonaSchema>;
export type DiscoveryCompetitorInput = z.infer<typeof discoveryCompetitorSchema>;
export type DiscoveryProductInput = z.infer<typeof discoveryProductSchema>;
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type OpportunityPatchInput = z.infer<typeof opportunityPatchSchema>;

// ── Helper: Eligible employee roles (for API-side validation) ────────

export const ELIGIBLE_EMPLOYEE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.TEAMLEADER,
  UserRole.CREATIVE,
];