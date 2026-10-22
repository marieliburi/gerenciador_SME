import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Task, TaskFormData, TaskStatus } from '@/types';
import * as taskService from '@/features/tasks/taskService';

export function useTasks(statuses: TaskStatus[]) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef<Set<string>>(new Set());

  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.fetchTasks(statuses);
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar tarefas.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statuses]);

  const addTask = useCallback(async (formData: TaskFormData, userId: string) => {
    const tempId = `temp-${Date.now()}`;
    if (savingRef.current.has(tempId)) return;
    savingRef.current.add(tempId);

    try {
      const newTask = await taskService.createTask(formData, userId);
      // Only add if the task matches current view statuses
      if (statuses.includes(newTask.status)) {
        setTasks((prev) => [newTask, ...prev]);
      }
      toast.success('Tarefa criada com sucesso!');
      return newTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar tarefa.';
      toast.error(message);
      throw err;
    } finally {
      savingRef.current.delete(tempId);
    }
  }, [statuses]);

  const editTask = useCallback(async (id: string, formData: Partial<Task>) => {
    if (savingRef.current.has(id)) return;
    savingRef.current.add(id);

    const previousTasks = tasks;

    try {
      const currentTask = tasks.find((t) => t.id === id);
      if (!currentTask) throw new Error('Tarefa não encontrada.');

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...formData } : t))
      );

      const updated = await taskService.updateTask(id, formData, currentTask.updated_at);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
      toast.success('Tarefa atualizada com sucesso!');
      return updated;
    } catch (err) {
      // Rollback
      setTasks(previousTasks);
      const message = err instanceof Error ? err.message : 'Erro ao atualizar tarefa.';
      toast.error(message);
      throw err;
    } finally {
      savingRef.current.delete(id);
    }
  }, [tasks]);

  const removeTask = useCallback(async (id: string) => {
    if (savingRef.current.has(id)) return;
    savingRef.current.add(id);

    const previousTasks = tasks;

    try {
      // Optimistic removal
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await taskService.deleteTask(id);
      toast.success('Tarefa excluída com sucesso!');
    } catch (err) {
      setTasks(previousTasks);
      const message = err instanceof Error ? err.message : 'Erro ao excluir tarefa.';
      toast.error(message);
      throw err;
    } finally {
      savingRef.current.delete(id);
    }
  }, [tasks]);

  const moveTask = useCallback(async (id: string, newStatus: TaskStatus) => {
    if (savingRef.current.has(id)) return;
    savingRef.current.add(id);

    const previousTasks = tasks;

    try {
      const currentTask = tasks.find((t) => t.id === id);
      if (!currentTask) throw new Error('Tarefa não encontrada.');

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );

      await taskService.updateTaskStatus(id, newStatus, currentTask.updated_at);
    } catch (err) {
      setTasks(previousTasks);
      const message = err instanceof Error ? err.message : 'Erro ao mover tarefa.';
      toast.error(message);
      throw err;
    } finally {
      savingRef.current.delete(id);
    }
  }, [tasks]);

  const completeTaskAction = useCallback(async (id: string) => {
    if (savingRef.current.has(id)) return;
    savingRef.current.add(id);

    const previousTasks = tasks;

    try {
      const currentTask = tasks.find((t) => t.id === id);
      if (!currentTask) throw new Error('Tarefa não encontrada.');

      // Optimistic removal from active board
      setTasks((prev) => prev.filter((t) => t.id !== id));

      await taskService.completeTask(id, currentTask.updated_at);
      toast.success('Tarefa concluída!');
    } catch (err) {
      setTasks(previousTasks);
      const message = err instanceof Error ? err.message : 'Erro ao concluir tarefa.';
      toast.error(message);
      throw err;
    } finally {
      savingRef.current.delete(id);
    }
  }, [tasks]);

  const reopenTaskAction = useCallback(async (id: string, newStatus: TaskStatus) => {
    if (savingRef.current.has(id)) return;
    savingRef.current.add(id);

    const previousTasks = tasks;

    try {
      const currentTask = tasks.find((t) => t.id === id);
      if (!currentTask) throw new Error('Tarefa não encontrada.');

      // Optimistic removal from completed view
      setTasks((prev) => prev.filter((t) => t.id !== id));

      await taskService.reopenTask(id, newStatus, currentTask.updated_at);
      toast.success('Tarefa reaberta!');
    } catch (err) {
      setTasks(previousTasks);
      const message = err instanceof Error ? err.message : 'Erro ao reabrir tarefa.';
      toast.error(message);
      throw err;
    } finally {
      savingRef.current.delete(id);
    }
  }, [tasks]);

  return {
    tasks,
    setTasks,
    loading,
    error,
    addTask,
    editTask,
    removeTask,
    moveTask,
    completeTask: completeTaskAction,
    reopenTask: reopenTaskAction,
    refreshTasks,
  };
}
