// lib/permissions.ts
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
  "task:create": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER"],
  "task:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "task:update": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "task:delete": ["SUPERADMIN", "ADMIN"],

  // Tag Management
  "tag:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "tag:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE"],
  "tag:update": ["SUPERADMIN", "ADMIN"],
  "tag:delete": ["SUPERADMIN", "ADMIN"],

  // Financials & Payouts
  "payout:create": ["SUPERADMIN", "ADMIN", "FINANCE"],
  "payout:read:all": ["SUPERADMIN", "ADMIN", "FINANCE"],
  "payout:read:own": ["OPERATOR", "TEAMLEADER", "CREATIVE"],
  "financials:view_summary": ["SUPERADMIN", "ADMIN", "FINANCE"],

  // User & Team Management
  "user:create": ["SUPERADMIN", "ADMIN"],
  "user:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "FINANCE"],
  "user:update_role": ["SUPERADMIN", "ADMIN"],
  "user:delete": ["SUPERADMIN", "ADMIN"],

  // Client Portal & Projects
  "project:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "project:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "project:update": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "project:delete": ["SUPERADMIN", "ADMIN"],

  // Task Categories
  "taskCategory:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE"],
  "taskCategory:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "taskCategory:update": ["SUPERADMIN", "ADMIN"],
  "taskCategory:delete": ["SUPERADMIN", "ADMIN"],

  // Comments
  "comment:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "comment:create": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "CLIENT"],
  "comment:update": ["SUPERADMIN", "ADMIN", "TEAMLEADER", "CREATIVE"],
  "comment:delete": ["SUPERADMIN", "ADMIN", "TEAMLEADER"],

  // Todos
  "todo:create": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "todo:update": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "todo:delete": ["SUPERADMIN", "ADMIN", "TEAMLEADER"],

  // Work Sessions
  "workSession:create": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "workSession:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE"],
  "workSession:update": ["SUPERADMIN", "ADMIN", "TEAMLEADER"],

  // Location
  "location:update": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "location:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],

  // Assignees
  "assignee:add": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER"],
  "assignee:remove": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER"],
  "assignee:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],

  // Assets
  "asset:assign": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "asset:unassign": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "asset:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE"],

  // Invitations
  "invitation:create": ["SUPERADMIN", "ADMIN"],
  "invitation:read": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "invitation:delete": ["SUPERADMIN", "ADMIN"],

  // Notifications
  "notification:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "notification:update": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "notification:delete": ["SUPERADMIN", "ADMIN", "TEAMLEADER"],

  // Reporting
  "project:reporting:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "FINANCE"],

  // ─── Attendance Management ──────────────────────────────────────────────
  "attendance:create": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"],
  "attendance:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "attendance:update": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER"],
  "attendance:delete": ["SUPERADMIN", "ADMIN"],
  "attendance:manage": ["SUPERADMIN", "ADMIN"],

  // Purchase Order Management
  "purchase:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "purchase:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "FINANCE"],
  "purchase:update": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "purchase:delete": ["SUPERADMIN", "ADMIN"],

  // ─── Milestone Management ───────────────────────────────────────────────
  "milestone:create": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "milestone:read": ["SUPERADMIN", "ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE", "FINANCE", "CLIENT"],
  "milestone:update": ["SUPERADMIN", "ADMIN", "OPERATOR"],
  "milestone:delete": ["SUPERADMIN", "ADMIN"],

    

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