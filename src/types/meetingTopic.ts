// src/types/meetingTopic.ts

export interface MeetingTopicItem {
  id: string;
  topic_id: string;
  content: string;
  is_completed: boolean;
  position?: number;
  created_at?: string;
}

export interface MeetingTopic {
  id: string;
  title: string;
  description?: string | null;
  status?: 'active' | 'completed' | 'archived';
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  items?: MeetingTopicItem[]; // Itens vinculados à pauta
}