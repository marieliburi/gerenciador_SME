import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MeetingTopic } from '../types/meetingTopic';
import { X, Save, Loader2 } from 'lucide-react';

interface MeetingTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  topicToEdit?: MeetingTopic | null;
}

export default function MeetingTopicModal({
  isOpen,
  onClose,
  onSaved,
  topicToEdit,
}: MeetingTopicModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (topicToEdit) {
      setTitle(topicToEdit.title || '');
      setDescription(topicToEdit.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [topicToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado');

      const authorName = user.email ? user.email.split('@')[0] : 'usuario';

      if (topicToEdit) {
        // Atualizar
        const { error } = await supabase
          .from('meeting_topics')
          .update({
            title: title.trim(),
            description: description.trim() || null,
          })
          .eq('id', topicToEdit.id);

        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase.from('meeting_topics').insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            created_by: user.id,
            created_by_name: authorName,
          },
        ]);

        if (error) throw error;
      }

      setTitle('');
      setDescription('');
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar a pauta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{topicToEdit ? 'Editar Pauta de Reunião' : 'Nova Pauta para Reunião'}</h3>
          <button type="button" onClick={onClose} className="btn-close-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label className="modal-label">Assunto / Pauta *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo fluxo de exportação de notas PDF"
              className="modal-input"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Detalhamento (Opcional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o motivo desta pauta e o que precisa ser alinhado com a equipe..."
              className="modal-textarea"
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-modal-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-modal-submit">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : topicToEdit ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              ) : (
                <>
                  <span>Cadastrar Pauta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}