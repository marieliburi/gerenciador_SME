// src/services/taskService.ts
import { supabase } from '../lib/supabaseClient';
import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../types/task';

export const taskService = {
  // Buscar tarefas ativas (não concluídas)
  async getActiveTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Task[]) || [];
  },

  // Buscar tarefas concluídas
  async getCompletedTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return (data as Task[]) || [];
  },

  // Criar tarefa (sem descrição obrigatória)
  async createTask(task: CreateTaskDTO): Promise<Task> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        status: 'todo',
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Atualizar tarefa
  async updateTask(id: string, updates: UpdateTaskDTO): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Concluir tarefa (define status 'completed' e data de conclusão)
  async completeTask(id: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Reabrir tarefa
  async reopenTask(id: string, newStatus: Exclude<TaskStatus, 'completed'>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Deletar tarefa
  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Sincronização em Tempo Real (Realtime)
  subscribeToTasks(onPayload: (payload: any) => void) {
    return supabase
      .channel('tasks-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => onPayload(payload)
      )
      .subscribe();
  },
};