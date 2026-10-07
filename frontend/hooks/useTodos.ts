'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { todoApi, getAuthToken, clearAuthSession } from '@/lib/api';
import { Todo, normalizeTodo } from '@/types/todo';

export type FilterType = 'all' | 'pending' | 'completed';

export function useTodos(projectId?: number | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const cacheKey = useMemo(() => {
    return projectId ? `todo_app_cache_project_${projectId}` : 'todo_app_cache_personal';
  }, [projectId]);

  // 1. Caching Layer: Ambil dari cache local storage terlebih dahulu
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed: any[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setTodos(parsed.map(normalizeTodo));
          }
        } else {
          setTodos([]);
        }
      } catch (e) {
        console.warn('Gagal membaca cache lokal:', e);
      }
    }
  }, [cacheKey]);

  // Simpan state terbaru ke cache
  const updateCache = useCallback((updatedTodos: Todo[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updatedTodos));
      } catch (e) {
        console.warn('Gagal menyimpan cache:', e);
      }
    }
  }, [cacheKey]);

  // 2. Fetch Data Nyata dari Backend MySQL Laragon
  const fetchTodos = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await todoApi.getAll(projectId);
      if (response.success && Array.isArray(response.data)) {
        const normalized = response.data.map(normalizeTodo);
        setTodos(normalized);
        updateCache(normalized);
      }
    } catch (err: any) {
      if (
        err.message?.includes('Sesi tidak valid') ||
        err.message?.includes('Akses ditolak') ||
        err.message?.includes('Token')
      ) {
        clearAuthSession();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }
      setError(err.message || 'Gagal mengambil data tugas dari server.');
    } finally {
      setLoading(false);
    }
  }, [projectId, updateCache]);

  // 2B. Silent Background Sync (Real-time tanpa kedip loading)
  const fetchTodosSilent = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await todoApi.getAll(projectId);
      if (response.success && Array.isArray(response.data)) {
        const normalized = response.data.map(normalizeTodo);
        setTodos((prev) => {
          // Bandingkan untuk hindari re-render jika tidak ada perubahan dari teman
          const isSame =
            prev.length === normalized.length &&
            prev.every(
              (item, idx) =>
                item.id === normalized[idx]?.id &&
                item.completed === normalized[idx]?.completed &&
                (item.title || item.task) === (normalized[idx]?.title || normalized[idx]?.task)
            );
          if (isSame) return prev;
          updateCache(normalized);
          return normalized;
        });
      }
    } catch {
      // Silent error ignore in background
    }
  }, [projectId, updateCache]);

  useEffect(() => {
    fetchTodos();

    // Auto-polling real-time setiap 5 detik agar perubahan teman langsung terlihat
    const interval = setInterval(() => {
      fetchTodosSilent();
    }, 5000);

    // Sync instan saat pengguna kembali ke tab browser
    const handleFocus = () => {
      fetchTodosSilent();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchTodos, fetchTodosSilent]);

  // 3. Tambah Tugas Baru (Pribadi atau Kelompok)
  const addTodo = async (task: string) => {
    const trimmed = task.trim();
    if (!trimmed) return;

    setError(null);
    try {
      const res = await todoApi.create(trimmed, projectId);
      if (res.success && res.data) {
        const newTodo = normalizeTodo(res.data);
        setTodos((prev) => {
          const next = [newTodo, ...prev];
          updateCache(next);
          return next;
        });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan tugas ke database.');
      throw err;
    }
  };

  // 4. Toggle Status Tugas (Selesai / Belum Selesai)
  const toggleTodo = async (id: number) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    const newStatus = !target.completed;

    // Optimistic UI Update
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: newStatus, is_completed: newStatus ? 1 : 0 } : t));
      updateCache(next);
      return next;
    });

    try {
      await todoApi.update(id, { is_completed: newStatus });
    } catch (err: any) {
      // Rollback jika error
      setTodos((prev) => {
        const rolledBack = prev.map((t) => (t.id === id ? target : t));
        updateCache(rolledBack);
        return rolledBack;
      });
      setError('Gagal memperbarui status tugas di server.');
    }
  };

  // 5. Edit Isi Teks Tugas
  const updateTodoText = async (id: number, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;

    const target = todos.find((t) => t.id === id);
    if (!target) return;

    // Optimistic update
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, task: trimmed, title: trimmed } : t));
      updateCache(next);
      return next;
    });

    try {
      await todoApi.update(id, { task: trimmed });
    } catch (err: any) {
      setTodos((prev) => {
        const rolledBack = prev.map((t) => (t.id === id ? target : t));
        updateCache(rolledBack);
        return rolledBack;
      });
      setError('Gagal mengedit isi tugas.');
      throw err;
    }
  };

  // 6. Hapus Tugas
  const deleteTodo = async (id: number) => {
    const previousTodos = [...todos];

    // Optimistic UI Update
    setTodos((prev) => {
      const next = prev.filter((t) => t.id !== id);
      updateCache(next);
      return next;
    });

    try {
      await todoApi.delete(id);
    } catch (err: any) {
      setTodos(previousTodos);
      updateCache(previousTodos);
      setError(err.message || 'Gagal menghapus tugas dari server.');
      throw err;
    }
  };

  // 7. Filter & Pencarian Teks
  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      // Filter status
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'completed'
          ? t.completed
          : !t.completed;

      // Filter search query
      const matchesSearch = searchQuery.trim() === '' ||
        (t.task && t.task.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.creator_username && t.creator_username.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [todos, filter, searchQuery]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [todos]);

  return {
    todos: filteredTodos,
    allTodos: todos,
    loading,
    error,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    stats,
    addTodo,
    toggleTodo,
    updateTodoText,
    deleteTodo,
    refresh: fetchTodos,
  };
}
