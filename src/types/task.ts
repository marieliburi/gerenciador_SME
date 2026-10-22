export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed';
export type TaskCategory = 'user_support' | 'system_update';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority?: TaskPriority | null;
  responsible_user_id?: string | null;
  card_color?: string | null;
  created_by: string;
  created_by_name?: string | null; // <--- NOVA PROPRIEDADE
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export type CreateTaskDTO = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'created_by'>;
export type UpdateTaskDTO = Partial<CreateTaskDTO>;