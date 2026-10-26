import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Task, TaskStatus } from '../types/task';
import type { TaskFormData } from '../types';
import { taskService } from '../services/taskService';

export function useTasks(statuses: TaskStatus[]) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef<Set<string>>(new Set());

  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [activeTasks, completedTasks] = await Promise.all([
        taskService.getActiveTasks(),
        taskService.getCompletedTasks(),
      ]);

      const allTasks = [...activeTasks, ...completedTasks];
      const filteredTasks = allTasks.filter((task) =>
        statuses.includes(task.status)
      );

      setTasks(filteredTasks);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar tarefas.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statuses]);

  const addTask = useCallback(
    async (formData: TaskFormData, _userId: string) => {
      const tempId = `temp-${Date.now()}`;

      if (savingRef.current.has(tempId)) return;
      savingRef.current.add(tempId);

      try {
        const newTask = await taskService.createTask({
          ...formData,
          status: 'todo',
        });

        if (statuses.includes(newTask.status)) {
          setTasks((prev) => [newTask, ...prev]);
        }

        toast.success('Tarefa criada com sucesso!');
        return newTask;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao criar tarefa.';

        toast.error(message);
        throw err;
      } finally {
        savingRef.current.delete(tempId);
      }
    },
    [statuses]
  );

  const editTask = useCallback(
    async (id: string, formData: Partial<Task>) => {
      if (savingRef.current.has(id)) return;
      savingRef.current.add(id);

      const previousTasks = tasks;

      try {
        const currentTask = tasks.find((task) => task.id === id);

        if (!currentTask) {
          throw new Error('Tarefa não encontrada.');
        }

        setTasks((prev) =>
          prev.map((task) =>
            task.id === id ? { ...task, ...formData } : task
          )
        );

        const updated = await taskService.updateTask(id, formData);

        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updated : task))
        );

        toast.success('Tarefa atualizada com sucesso!');
        return updated;
      } catch (err) {
        setTasks(previousTasks);

        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao atualizar tarefa.';

        toast.error(message);
        throw err;
      } finally {
        savingRef.current.delete(id);
      }
    },
    [tasks]
  );

  const removeTask = useCallback(
    async (id: string) => {
      if (savingRef.current.has(id)) return;
      savingRef.current.add(id);

      const previousTasks = tasks;

      try {
        setTasks((prev) => prev.filter((task) => task.id !== id));

        await taskService.deleteTask(id);

        toast.success('Tarefa excluída com sucesso!');
      } catch (err) {
        setTasks(previousTasks);

        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao excluir tarefa.';

        toast.error(message);
        throw err;
      } finally {
        savingRef.current.delete(id);
      }
    },
    [tasks]
  );

  const moveTask = useCallback(
    async (id: string, newStatus: TaskStatus) => {
      if (savingRef.current.has(id)) return;
      savingRef.current.add(id);

      const previousTasks = tasks;

      try {
        const currentTask = tasks.find((task) => task.id === id);

        if (!currentTask) {
          throw new Error('Tarefa não encontrada.');
        }

        if (newStatus === 'completed') {
          await taskService.completeTask(id);
        } else if (currentTask.status === 'completed') {
          await taskService.reopenTask(
            id,
            newStatus as Exclude<TaskStatus, 'completed'>
          );
        } else {
          await taskService.updateTask(id, { status: newStatus });
        }

        if (!statuses.includes(newStatus)) {
          setTasks((prev) =>
            prev.filter((task) => task.id !== id)
          );
        } else {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === id
                ? {
                  ...task,
                  status: newStatus,
                  ...(newStatus === 'completed'
                    ? { completed_at: new Date().toISOString() }
                    : { completed_at: null }),
                }
                : task
            )
          );
        }
      } catch (err) {
        setTasks(previousTasks);

        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao mover tarefa.';

        toast.error(message);
        throw err;
      } finally {
        savingRef.current.delete(id);
      }
    },
    [tasks, statuses]
  );

  const completeTaskAction = useCallback(
    async (id: string) => {
      if (savingRef.current.has(id)) return;
      savingRef.current.add(id);

      const previousTasks = tasks;

      try {
        const currentTask = tasks.find((task) => task.id === id);

        if (!currentTask) {
          throw new Error('Tarefa não encontrada.');
        }

        await taskService.completeTask(id);

        setTasks((prev) =>
          statuses.includes('completed')
            ? prev.map((task) =>
              task.id === id
                ? {
                  ...task,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                }
                : task
            )
            : prev.filter((task) => task.id !== id)
        );

        toast.success('Tarefa concluída!');
      } catch (err) {
        setTasks(previousTasks);

        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao concluir tarefa.';

        toast.error(message);
        throw err;
      } finally {
        savingRef.current.delete(id);
      }
    },
    [tasks, statuses]
  );

  const reopenTaskAction = useCallback(
    async (id: string, newStatus: Exclude<TaskStatus, 'completed'>) => {
      if (savingRef.current.has(id)) return;
      savingRef.current.add(id);

      const previousTasks = tasks;

      try {
        const currentTask = tasks.find((task) => task.id === id);

        if (!currentTask) {
          throw new Error('Tarefa não encontrada.');
        }

        await taskService.reopenTask(id, newStatus);

        setTasks((prev) =>
          statuses.includes(newStatus)
            ? prev.map((task) =>
              task.id === id
                ? {
                  ...task,
                  status: newStatus,
                  completed_at: null,
                }
                : task
            )
            : prev.filter((task) => task.id !== id)
        );

        toast.success('Tarefa reaberta!');
      } catch (err) {
        setTasks(previousTasks);

        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao reabrir tarefa.';

        toast.error(message);
        throw err;
      } finally {
        savingRef.current.delete(id);
      }
    },
    [tasks, statuses]
  );

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
