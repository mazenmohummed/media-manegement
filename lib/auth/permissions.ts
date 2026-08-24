export type UserRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "OPERATOR"
  | "TEAMLEADER"
  | "CREATIVE"
  | "FINANCE"
  | "CLIENT";

export type SubscriptionPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

// ── 1. ACTION-BASED PERMISSION MATRIX ──────────────────────────────────────
export const ACTION_PERMISSIONS = {
  // Department Management
  "department:create": ["SUPERADMIN", "ADMIN"],
  "department:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE"],
  "department:update": ["SUPERADMIN", "ADMIN"],
  "department:delete": ["SUPERADMIN", "ADMIN"],

  // Task Management
  "task:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "task:update": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "task:delete": ["SUPERADMIN", "ADMIN"],

  // Financials & Payouts
  "payout:create": ["SUPERADMIN", "ADMIN", "FINANCE"],
  "payout:read:all": ["SUPERADMIN", "ADMIN", "FINANCE"],
  "payout:read:own": ["OPERATOR", "TEAMLEADER", "CREATIVE"],
  "financials:view_summary": ["SUPERADMIN", "ADMIN", "FINANCE"],

  // User & Team Management
  "user:create": ["SUPERADMIN", "ADMIN"],
  "user:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "FINANCE"],
  "user:update_role": ["SUPERADMIN", "ADMIN"],

  // Client Portal & Projects
  "project:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "project:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],

  // Task Categories
  "taskCategory:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE"],
  "taskCategory:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "taskCategory:update": ["SUPERADMIN", "ADMIN"],
  "taskCategory:delete": ["SUPERADMIN", "ADMIN"],
} as const;
export type Action = keyof typeof ACTION_PERMISSIONS;

// ── 2. SUBSCRIPTION FEATURE LIMITS & GATES ──────────────────────────────────
export const PLAN_LIMITS: Record<SubscriptionPlan, { maxUsers: number; geoFencing: boolean; customReports: boolean }> = {
  FREE: { maxUsers: 3, geoFencing: false, customReports: false },
  STARTER: { maxUsers: 10, geoFencing: false, customReports: false },
  PRO: { maxUsers: 25, geoFencing: true, customReports: true },
  ENTERPRISE: { maxUsers: 999, geoFencing: true, customReports: true },
};

// ── 3. GUARD HELPERS ────────────────────────────────────────────────────────
export function hasPermission(role: string | null, action: Action): boolean {
  if (!role) return false;
  const allowedRoles = ACTION_PERMISSIONS[action] as readonly string[];
  return allowedRoles?.includes(role) ?? false;
}

export function enforcePlanLimit(plan: SubscriptionPlan, feature: keyof typeof PLAN_LIMITS.FREE): boolean | number {
  return PLAN_LIMITS[plan]?.[feature] ?? false;
}