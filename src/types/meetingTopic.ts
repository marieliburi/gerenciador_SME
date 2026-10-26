// src/types/meetingTopic.ts

export interface PendingItem {
  id: string;
  content: string;
  created_at?: string;
}

export interface MeetingTopic {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}