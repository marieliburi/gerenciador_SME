import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Note } from '../types/note';
import '../styles/notes.css';
import { StickyNote, Plus, Trash2, Check, Loader2 } from 'lucide-react';

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Erro ao buscar notas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel('public:quick_notes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quick_notes' },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const authorName = user.email ? user.email.split('@')[0] : 'usuario';

      const { error } = await supabase.from('quick_notes').insert([
        {
          content: content.trim(),
          color: 'yellow',
          created_by: user.id,
          created_by_name: authorName,
        },
      ]);

      if (error) throw error;

      setContent('');
      fetchNotes();
    } catch (err) {
      console.error('Erro ao criar nota:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (note: Note) => {
    try {
      const { error } = await supabase
        .from('quick_notes')
        .update({ is_completed: !note.is_completed })
        .eq('id', note.id);

      if (error) throw error;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id ? { ...n, is_completed: !n.is_completed } : n
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar nota:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('quick_notes').delete().eq('id', id);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
    }
  };

  return (
    <div className="notes-section">
      
      {/* Caixa de Criação de Nota */}
      <form onSubmit={handleCreateNote} className="note-creator-card">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um novo lembrete..."
          className="note-input-area"
        />

        <div className="note-creator-footer">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="btn-nova-tarefa"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Adicionar Nota</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* QUADRO DE CORTIÇA COM OS POST-ITS */}
      <div className="corkboard-container">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-amber-100" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-amber-100 font-medium">
            O quadro está vazio. Fixe sua primeira nota acima!
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <div key={note.id}>
                <div className={`postit-card ${note.is_completed ? 'completed' : ''}`}>
                  {/* Alfinete Vermelho */}
                  <div className="pin-red" />

                  <p className="postit-content">{note.content}</p>

                  <div className="postit-footer">
                    <span className="postit-author">
                      {note.created_by_name || 'usuario'}
                    </span>

                    <div className="postit-actions">
                      <button
                        onClick={() => handleToggleComplete(note)}
                        className="postit-action-btn"
                        title={note.is_completed ? 'Reabrir nota' : 'Concluir nota'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="postit-action-btn"
                        title="Excluir nota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}