export type Todo = {
  id: number;
  user_id?: number;
  project_id?: number | null;
  task?: string;
  title: string;
  is_completed?: number | boolean;
  completed: boolean;
  creator_username?: string;
  project_name?: string;
  createdAt?: string;
};

export interface ProjectData {
  id: number;
  name: string;
  code: string;
  created_by: number;
  plan_data?: string | any;
  created_at?: string;
  creator_username?: string;
  member_count?: number;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  username: string;
  email: string;
  joined_at: string;
}

export interface AiTask {
  id: string;
  role: string;
  roleSlug: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  phase: string;
  estimatedDays: number;
}

export interface AiRole {
  roleName: string;
  slug: string;
  title: string;
  responsibilities: string[];
  deliverables: string[];
}

export interface AiErdTable {
  tableName: string;
  description: string;
  columns: Array<{
    name: string;
    type: string;
    key?: string;
    description?: string;
  }>;
}

export interface AiMilestone {
  phase: string;
  title: string;
  duration: string;
  description: string;
}

export interface AiProjectPlan {
  projectName: string;
  summary: string;
  targetDuration: string;
  isSoftware?: boolean;
  prd: {
    background: string;
    problemStatement: string;
    proposedSolution: string;
    targetAudience: string[];
    functionalRequirements: Array<{
      module: string;
      features: string[];
    }>;
    nonFunctionalRequirements: string[];
    systemConstraints: string[];
  };
  erd: {
    description: string;
    mermaid: string;
    tables: AiErdTable[];
  } | null;
  roles: AiRole[];
  milestones: AiMilestone[];
  tasks: AiTask[];
}

export function normalizeTodo(raw: any): Todo {
  const isDone = Boolean(raw.is_completed === 1 || raw.is_completed === true || raw.completed === true);
  const taskText = raw.task || raw.title || raw.todo || 'Tugas Baru';
  return {
    id: Number(raw.id),
    user_id: raw.user_id ? Number(raw.user_id) : undefined,
    project_id: raw.project_id ? Number(raw.project_id) : null,
    task: taskText,
    title: taskText,
    is_completed: isDone ? 1 : 0,
    completed: isDone,
    creator_username: raw.creator_username || undefined,
    project_name: raw.project_name || undefined,
    createdAt: raw.createdAt || raw.created_at || undefined
  };
}