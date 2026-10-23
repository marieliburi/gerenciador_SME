export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple';

export interface Note {
  id: string;
  content: string;
  color: NoteColor;
  is_completed: boolean;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
}