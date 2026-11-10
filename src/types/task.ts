// src/types/task.ts

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed';
export type TaskCategory = 'demanda' | 'tarefa'; // <-- Atualizado para os novos valores do sistema
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  category: TaskCategory; // <-- Reutiliza o TaskCategory atualizado
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  completed_at?: string | null;
  created_by_name?: string;
  created_at?: string;
  card_color?: string;
}

export type CreateTaskDTO = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'created_by'>;
export type UpdateTaskDTO = Partial<CreateTaskDTO>;