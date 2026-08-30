// types/task.ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface Comment {
  id: string;
  text: string;
  author: User | null;
  createdAt: string;
}

export interface Todo {
  id: string;
  text: string;
  description: string | null;
  completed: boolean;
  priority: string;
  order: number;
  dueDate: string | null;
  createdBy: User | null;
}

export interface TaskDependency {
  id: string;
  title: string | null;
  taskNo: string | null;
  status: string;
}

export interface MilestoneData {
  id: string;
  name: string;
  progress: number;
  status: string;
  deadline: string | null;
}

export interface PlannedExpenseItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  totalEstimated: number;
  status: string;
}

export interface TaskExpenseItem {
  id: string;
  itemName: string;
  cost: number;
  category: string;
  status: string;
  description: string | null;
  receiptUrl: string | null;
  incurredAt: string | null;
  reimbursable: boolean;
}

export interface TaskDetail {
  id: string;
  taskNo: string | null;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  estimatedHours: number;
  actualHours: number;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  assignees: User[];
  category: { id: string; name: string } | null;
  milestone: MilestoneData | null;
  project: {
    id: string;
    name: string;
    projectNo: string | null;
    client?: {
      id: string;
      clientName: string;
      email: string | null;
      phoneNumber: string | null;
      accountType: string | null;
    } | null;
  } | null;
  dependsOn: TaskDependency[];
  dependents: TaskDependency[];
  comments: Comment[];
  todos: Todo[];
  plannedExpenses?: PlannedExpenseItem[];
  taskExpenses?: TaskExpenseItem[];
  _count: { comments: number; todos: number; plannedExpenses?: number; taskExpenses?: number };
  createdAt: string;
  updatedAt: string;
  assets?: {
    id: string;
    assetName: string;
    assetNo: string | null;
    availabilityStatus: string;
  }[];
    tags?: { id: string; name: string; color: string }[]; 
}