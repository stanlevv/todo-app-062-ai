// API Client & Service Layer terintegrasi dengan Backend Express.js & MySQL Laragon

const resolveApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  // Di browser, gunakan reverse proxy /api untuk hilangkan CORS preflight OPTIONS latency
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = resolveApiBaseUrl();

// 1. Session Storage Helpers
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const getAuthUser = (): { id: number; username: string; email: string } | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setAuthSession = (token: string, user: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  // Sinkronkan cookie untuk Server Components / Middleware
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
};

export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.cookie = 'token=; path=/; max-age=0';
};

// 2. HTTP Request Wrapper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        clearAuthSession();
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
          window.location.href = '/login';
        }
      }
    }
    throw new Error(data.message || 'Terjadi kesalahan pada request.');
  }

  return data;
}

// 3. Auth API Endpoints
export const authApi = {
  register: async (payload: { username: string; email: string; password: string }) => {
    return request<{ success: boolean; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login: async (payload: { username?: string; email?: string; password: string }) => {
    const res = await request<{
      success: boolean;
      message: string;
      data?: {
        token: string;
        user?: { id: number; username: string; email: string };
      };
      token?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const token = res.data?.token || res.token || '';
    const user = res.data?.user || { id: 0, username: payload.username || '', email: payload.username || '' };

    return {
      success: res.success,
      message: res.message,
      token,
      data: user,
    };
  },

  changePassword: async (payload: { oldPassword: string; newPassword: string }) => {
    return request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// 4. Project API Endpoints (Team Plan / Ruang Kelompok)
export const projectApi = {
  getAll: async () => {
    return request<{
      success: boolean;
      data: Array<{
        id: number;
        name: string;
        code: string;
        created_by: number;
        created_at: string;
        creator_username?: string;
        member_count?: number;
      }>;
    }>('/projects');
  },

  getDetail: async (id: number | string) => {
    return request<{
      success: boolean;
      data: {
        id: number;
        name: string;
        code: string;
        created_by: number;
        created_at: string;
        creator_username?: string;
        members: Array<{
          id: number;
          project_id: number;
          user_id: number;
          username: string;
          email: string;
          joined_at: string;
        }>;
      };
    }>(`/projects/${id}`);
  },

  create: async (name: string) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        id: number;
        name: string;
        code: string;
        created_by: number;
        created_at: string;
      };
    }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  join: async (code: string) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        id: number;
        name: string;
        code: string;
        created_by: number;
        created_at: string;
      };
    }>('/projects/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  leave: async (id: number | string) => {
    return request<{ success: boolean; message: string }>(`/projects/${id}/leave`, {
      method: 'POST',
    });
  },

  delete: async (id: number | string) => {
    return request<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  update: async (id: number | string, data: string | { name?: string; plan_data?: any }) => {
    const payload = typeof data === 'string' ? { name: data } : data;
    return request<{ success: boolean; message: string; data: any }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  removeMember: async (id: number | string, userId: number | string) => {
    return request<{ success: boolean; message: string }>(`/projects/${id}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  transferOwnership: async (id: number | string, targetUserId: number) => {
    return request<{ success: boolean; message: string; data: any }>(`/projects/${id}/transfer-owner`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  getActivities: async (id: number | string) => {
    return request<{
      success: boolean;
      data: Array<{
        id: number;
        project_id: number;
        user_id: number | null;
        action: string;
        details: string;
        created_at: string;
        username?: string | null;
      }>;
    }>(`/projects/${id}/activities`);
  },
};

// 5. Todo API Endpoints (CRUD MySQL)
export const todoApi = {
  getAll: async (projectId?: number | null) => {
    const query = projectId ? `?project_id=${projectId}` : '';
    return request<{
      success: boolean;
      data: Array<{
        id: number;
        user_id: number;
        project_id?: number | null;
        task: string;
        is_completed: number;
        creator_username?: string;
      }>;
    }>(`/todos${query}`);
  },

  getById: async (id: number | string) => {
    return request<{
      success: boolean;
      data: {
        id: number;
        user_id: number;
        project_id?: number | null;
        task: string;
        is_completed: number;
        creator_username?: string;
        project_name?: string;
      };
    }>(`/todos/${id}`);
  },

  create: async (task: string, projectId?: number | null) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        id: number;
        user_id: number;
        project_id?: number | null;
        task: string;
        is_completed: number;
        creator_username?: string;
      };
    }>('/todos', {
      method: 'POST',
      body: JSON.stringify({ task, project_id: projectId || undefined }),
    });
  },

  update: async (id: number | string, payload: { is_completed?: boolean | number; task?: string }) => {
    return request<{
      success: boolean;
      message: string;
      data?: { id: number; user_id: number; task: string; is_completed: number };
    }>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: number | string) => {
    return request<{ success: boolean; message: string }>(`/todos/${id}`, {
      method: 'DELETE',
    });
  },
};

// 6. AI Project & Task Planner API
export const aiApi = {
  getModels: async () => {
    return request<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        name: string;
        provider: 'openrouter' | 'gemini';
        badge: string;
        description: string;
        isFree: boolean;
      }>;
    }>('/ai/models');
  },

  grillMeNext: async (payload: {
    prompt: string;
    history?: Array<{ question: string; answer: string }>;
    isSoftware?: boolean;
    apiKey?: string;
    model?: string;
  }) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        round: number;
        aspect: string;
        question: string;
        contextHint: string;
        suggestions: string[];
      };
    }>('/ai/grill-me/next', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  generatePlan: async (payload: {
    prompt: string;
    projectType?: string;
    duration?: string;
    teamSize?: number;
    isSoftware?: boolean;
    answers?: Array<{ question: string; answer: string }>;
    apiKey?: string;
    model?: string;
  }) => {
    return request<{
      success: boolean;
      message: string;
      data: any;
    }>('/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  applyPlan: async (payload: {
    projectId?: number | null;
    projectName?: string;
    planData: any;
    selectedTasks?: string[];
  }) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        project: any;
        projectId: number;
        tasksCreated: number;
      };
    }>('/ai/apply-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  workspaceAsk: async (payload: {
    projectId: number;
    message: string;
    history?: Array<{ role: 'user' | 'model'; content: string }>;
    apiKey?: string;
    model?: string;
  }) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        reply: string;
        executedActions: string[];
        todos: Array<{
          id: number;
          todo: string;
          completed: boolean;
          project_id?: number | null;
          creator_username?: string;
        }>;
      };
    }>('/ai/workspace-ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// 8. System & Uptime Monitoring Endpoints
export const systemApi = {
  checkHealth: async () => {
    return request<{
      success: boolean;
      message: string;
      data: {
        status: string;
        uptime: number;
        timestamp: string;
        environment: string;
      };
    }>('/health');
  },
};

