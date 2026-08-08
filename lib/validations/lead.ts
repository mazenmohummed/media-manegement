import { z } from "zod";
import { LeadStatus, LeadSource } from "@prisma/client";

// Use Prisma's native enums with Zod for single source of truth
export const LeadStatusEnum = z.nativeEnum(LeadStatus);
export const LeadSourceEnum = z.nativeEnum(LeadSource);

// --- Base Creation Schema ---
export const createLeadSchema = z.object({
  leadNo: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().optional(),
  contactEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional(),
  industry: z.string().optional(),
  estimatedBudget: z.number().nonnegative("Budget must be a positive number").optional(),
  currency: z.string().default("EGP"),
  expectedCloseDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  source: LeadSourceEnum.default(LeadSource.OTHER),
  status: LeadStatusEnum.default(LeadStatus.NEW),
  notes: z.string().optional(),
  agencyId: z.string().min(1, "Agency ID is required"),
  ownerId: z.string().optional(),
});

// --- Update Schema ---
export const updateLeadSchema = createLeadSchema.partial();

// --- Status Update Schema ---
export const updateLeadStatusSchema = z
  .object({
    leadId: z.string().min(1, "Lead ID is required"),
    status: LeadStatusEnum,
    disqualifiedReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === LeadStatus.DISQUALIFIED) {
        return !!data.disqualifiedReason && data.disqualifiedReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Disqualification reason is required when status is DISQUALIFIED",
      path: ["disqualifiedReason"],
    }
  );

// --- Types ---
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;