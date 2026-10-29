import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  Maximize,
  Minimize,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Note } from '../types/note';
import '../styles/notes.css';

interface NoteWithDimensions extends Note {
  width?: number;
  height?: number;
  position_order?: number;
}

export default function NotesView() {
  const [notes, setNotes] = useState<NoteWithDimensions[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados para redimensionamento
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Estados para reordenação via Drag & Drop no Alfinete
  const [draggedNoteIndex, setDraggedNoteIndex] = useState<number | null>(null);
  const [dragOverNoteIndex, setDragOverNoteIndex] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = async () => {
    if (!boardRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await boardRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao ativar tela cheia:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === boardRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const fetchNotes = useCallback(async () => {
  setLoading(true);

  try {
    // Tenta buscar com a ordenação por posição
    let { data, error } = await supabase
      .from('quick_notes')
      .select('*')
      .order('position_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    // Se falhar (por exemplo, coluna position_order ainda não criada no banco), faz a busca padrão
    if (error) {
      console.warn('Tentando busca padrão sem position_order:', error.message);
      const fallback = await supabase
        .from('quick_notes')
        .select('*')
        .order('created_at', { ascending: true });

      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

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

  // Redimensionamento sem sair do quadro
  const handleResizeStart = (
    e: React.MouseEvent,
    noteId: string,
    currentWidth: number = 220,
    currentHeight: number = 220
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingNoteId(noteId);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingNoteId || !resizeStartRef.current || !boardRef.current) return;

      const { startX, startY, startWidth, startHeight } = resizeStartRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Obtém a largura útil do quadro descontando as margens
      const boardWidth = boardRef.current.clientWidth - 40;

      const newWidth = Math.min(Math.max(160, startWidth + deltaX), boardWidth);
      const newHeight = Math.max(160, startHeight + deltaY);

      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === resizingNoteId
            ? { ...note, width: newWidth, height: newHeight }
            : note
        )
      );
    };

    const handleMouseUp = async () => {
      if (!resizingNoteId) return;

      const updatedNote = notes.find((n) => n.id === resizingNoteId);
      const noteIdToUpdate = resizingNoteId;

      setResizingNoteId(null);
      resizeStartRef.current = null;

      if (updatedNote && (updatedNote.width || updatedNote.height)) {
        try {
          await supabase
            .from('quick_notes')
            .update({
              width: updatedNote.width,
              height: updatedNote.height,
            })
            .eq('id', noteIdToUpdate);
        } catch (err) {
          console.error('Erro ao salvar dimensões da nota:', err);
        }
      }
    };

    if (resizingNoteId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingNoteId, notes]);

  // Drag & Drop no Alfinete para Mudar a Ordem
  const handleDragStart = (index: number) => {
    setDraggedNoteIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverNoteIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (draggedNoteIndex === null || draggedNoteIndex === index) {
      setDraggedNoteIndex(null);
      setDragOverNoteIndex(null);
      return;
    }

    const updatedNotes = [...notes];
    const [movedNote] = updatedNotes.splice(draggedNoteIndex, 1);
    updatedNotes.splice(index, 0, movedNote);

    // Atualiza o estado local imediatamente
    setNotes(updatedNotes);
    setDraggedNoteIndex(null);
    setDragOverNoteIndex(null);

    // Persiste a nova ordem no Supabase
    try {
      const updates = updatedNotes.map((note, idx) =>
        supabase
          .from('quick_notes')
          .update({ position_order: idx })
          .eq('id', note.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Erro ao salvar ordem das notas:', err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!content.trim()) return;

  setSubmitting(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const authorName = user.email
      ? user.email.split('@')[0]
      : 'usuario';

    // Inserção simplificada sem enviar width/height/position_order diretamente
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
    await fetchNotes();
  } catch (err) {
    console.error('Erro ao criar nota:', err);
    alert('Não foi possível criar a nota.');
  } finally {
    setSubmitting(false);
  }
};

const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // Se pressionar Enter sem a tecla Shift
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Evita a quebra de linha padrão
    if (content.trim() && !submitting) {
      handleCreateNote(e); // Submete o formulário
    }
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
          n.id === note.id
            ? { ...n, is_completed: !n.is_completed }
            : n
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar nota:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quick_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
    }
  };

  return (
    <div className="notes-section">
      {/* Caixa de criação de nota */}
      <form onSubmit={handleCreateNote} className="note-creator-card">
        <textarea
          rows={2}
          value={content}
          onKeyDown={handleKeyDown}
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
                <span>Adicionar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quadro de cortiça */}
      <div
        ref={boardRef}
        className={`corkboard-container ${isFullscreen ? 'corkboard-fullscreen' : ''}`}
      >
        <button
          type="button"
          onClick={handleFullscreen}
          className="fullscreen-button"
          title={isFullscreen ? 'Sair da tela cheia' : 'Expandir quadro'}
        >
          {isFullscreen ? (
            <Minimize size={20} />
          ) : (
            <Maximize size={20} />
          )}
        </button>

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
            {notes.map((note, index) => {
              const cardWidth = note.width || 220;
              const cardHeight = note.height || 220;

              return (
                <div
                  key={note.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  className={`postit-wrapper ${dragOverNoteIndex === index ? 'drag-over' : ''}`}
                >
                  <div
                    className={`postit-card ${note.is_completed ? 'completed' : ''}`}
                    style={{
                      width: `${cardWidth}px`,
                      height: `${cardHeight}px`,
                      maxWidth: '100%',
                    }}
                  >
                    {/* Alfinete clicável e arrastável */}
                    <div
                      className="pin-red"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      title="Arraste o alfinete para mudar a ordem do post-it"
                    />

                    <p className="postit-content">{note.content}</p>

                    <div className="postit-footer">
                      <span className="postit-author">
                        {note.created_by_name || 'usuario'}
                      </span>

                      <div className="postit-actions">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(note)}
                          className="postit-action-btn"
                          title={note.is_completed ? 'Reabrir nota' : 'Concluir nota'}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="postit-action-btn"
                          title="Excluir nota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Puxador para redimensionamento */}
                    <div
                      className="postit-resize-handle"
                      onMouseDown={(e) =>
                        handleResizeStart(e, note.id, cardWidth, cardHeight)
                      }
                      title="Arraste para redimensionar"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}