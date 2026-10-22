export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed';
export type TaskCategory = 'user_support' | 'system_update';
export type TaskPriority = 'low' | 'medium' | 'high';
export type CardColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority | null;
  responsible_user_id: string | null;
  card_color: CardColor | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface TaskFormData {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority | null;
  responsible_user_id: string | null;
  card_color: CardColor | null;
}

export interface TaskFilters {
  search: string;
  category: TaskCategory | null;
  responsible_user_id: string | null;
  priority: TaskPriority | null;
  status: TaskStatus | null;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  waiting: 'Aguardando',
  completed: 'Concluída',
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  user_support: 'Atendimento ao usuário',
  system_update: 'Atualização de sistema',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export const CARD_COLORS: Record<CardColor, string> = {
  yellow: 'bg-pastel-yellow',
  blue: 'bg-pastel-blue',
  green: 'bg-pastel-green',
  pink: 'bg-pastel-pink',
  purple: 'bg-pastel-purple',
  orange: 'bg-pastel-orange',
};

export const CARD_COLOR_HEX: Record<CardColor, string> = {
  yellow: '#FFF9C4',
  blue: '#BBDEFB',
  green: '#C8E6C9',
  pink: '#F8BBD0',
  purple: '#E1BEE7',
  orange: '#FFE0B2',
};

export const ACTIVE_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'waiting'];
export const BOARD_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'waiting'];
