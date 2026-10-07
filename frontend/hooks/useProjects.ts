'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '@/lib/api';
import { ProjectData, ProjectMember } from '@/types/todo';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectData | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await projectApi.getAll();
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat ruang project.');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProject = useCallback(async (project: ProjectData | null) => {
    setActiveProject(project);
    if (project) {
      try {
        const res = await projectApi.getDetail(project.id);
        if (res.success && res.data) {
          setMembers(res.data.members || []);
        }
      } catch (err) {
        console.error('Failed to load project members:', err);
      }
    } else {
      setMembers([]);
    }
  }, []);

  const createProject = useCallback(async (name: string) => {
    const res = await projectApi.create(name);
    if (res.success && res.data) {
      await fetchProjects();
      await selectProject(res.data);
    }
    return res;
  }, [fetchProjects, selectProject]);

  const joinProject = useCallback(async (code: string) => {
    const res = await projectApi.join(code);
    if (res.success && res.data) {
      await fetchProjects();
      await selectProject(res.data);
    }
    return res;
  }, [fetchProjects, selectProject]);

  const leaveProject = useCallback(async (projectId: number) => {
    const res = await projectApi.leave(projectId);
    if (res.success) {
      setActiveProject(null);
      setMembers([]);
      await fetchProjects();
    }
    return res;
  }, [fetchProjects]);

  const deleteProject = useCallback(async (projectId: number) => {
    const res = await projectApi.delete(projectId);
    if (res.success) {
      setActiveProject(null);
      setMembers([]);
      await fetchProjects();
    }
    return res;
  }, [fetchProjects]);

  const updateProject = useCallback(async (projectId: number, payload: string | { name?: string; plan_data?: any }) => {
    const res = await projectApi.update(projectId, payload);
    if (res.success && res.data) {
      setActiveProject((prev) => (prev && prev.id === projectId ? { ...prev, ...res.data } : prev));
      await fetchProjects();
    }
    return res;
  }, [fetchProjects]);

  const removeMember = useCallback(async (projectId: number, userId: number) => {
    const res = await projectApi.removeMember(projectId, userId);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    }
    return res;
  }, []);

  const transferOwnership = useCallback(async (projectId: number, targetUserId: number) => {
    const res = await projectApi.transferOwnership(projectId, targetUserId);
    if (res.success && res.data) {
      if (res.data.project) {
        setActiveProject(res.data.project);
      }
      if (res.data.members) {
        setMembers(res.data.members);
      }
      await fetchProjects();
    }
    return res;
  }, [fetchProjects]);

  const getActivities = useCallback(async (projectId: number) => {
    return await projectApi.getActivities(projectId);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    activeProject,
    members,
    loading,
    error,
    fetchProjects,
    selectProject,
    createProject,
    joinProject,
    leaveProject,
    deleteProject,
    updateProject,
    removeMember,
    transferOwnership,
    getActivities,
  };
}
