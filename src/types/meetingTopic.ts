export type MeetingTopicStatus = 'pendente' | 'em_discussao' | 'aprovado' | 'rejeitado';

export interface MeetingTopic {
  id: string;
  title: string;
  description?: string | null;
  status: MeetingTopicStatus;
  votes: number;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateMeetingTopicDTO = Omit<
  MeetingTopic,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'votes'
>;