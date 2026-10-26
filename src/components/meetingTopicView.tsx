import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MeetingTopic, MeetingTopicStatus } from '../types/meetingTopic';
import '../styles/meeting.css';
import {
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  HelpCircle
} from 'lucide-react';

interface MeetingTopicsViewProps {
  onOpenCreateModal: () => void;
  onOpenEditModal: (topic: MeetingTopic) => void;
  // Callback para permitir que o pai dispare a atualização
  onFetchTopicsRef?: (fetchFn: () => void) => void; 
}

export default function MeetingTopicsView({
  onOpenCreateModal,
  onOpenEditModal,
  onFetchTopicsRef,
}: MeetingTopicsViewProps) {
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTopics(data || []);
    } catch (err) {
      console.error('Erro ao buscar pautas de reunião:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();

    if (onFetchTopicsRef) {
      onFetchTopicsRef(fetchTopics);
    }

    // Listener Realtime
    const channel = supabase
      .channel('public:meeting_topics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_topics' },
        () => {
          fetchTopics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTopics, onFetchTopicsRef]);

  const handleStatusChange = async (topicId: string, newStatus: MeetingTopicStatus) => {
    try {
      const { error } = await supabase
        .from('meeting_topics')
        .update({ status: newStatus })
        .eq('id', topicId);

      if (error) throw error;

      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('Deseja realmente remover esta pauta?')) return;

    try {
      const { error } = await supabase
        .from('meeting_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    } catch (err) {
      console.error('Erro ao excluir pauta:', err);
    }
  };

  const getStatusBadge = (status: MeetingTopicStatus) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="topic-status-badge aprovado">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
          </span>
        );
      case 'rejeitado':
        return (
          <span className="topic-status-badge rejeitado">
            <XCircle className="w-3.5 h-3.5" /> Recusado
          </span>
        );
      case 'em_discussao':
        return (
          <span className="topic-status-badge em_discussao">
            <Clock className="w-3.5 h-3.5" /> Em Discussão
          </span>
        );
      default:
        return (
          <span className="topic-status-badge pendente">
            <HelpCircle className="w-3.5 h-3.5" /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="topics-section">
      <div className="topics-header">
        <div className="topics-header-title">
          <div className="topics-icon-box">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="topics-header-text">
            <h3>Pauta para Reuniões</h3>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="btn-nova-tarefa !bg-purple-700 hover:!bg-purple-800"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Pauta</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : topics.length === 0 ? (
        <div className="empty-task-state">
          Nenhuma pauta cadastrada para as próximas reuniões.
        </div>
      ) : (
        <div className="topics-grid">
          {topics.map((topic) => (
            <div key={topic.id} className="topic-card">
              <div className="topic-card-body">
                <div className="topic-card-header">
                  {getStatusBadge(topic.status)}

                  <div className="task-card-header-actions">
                    <button
                      onClick={() => onOpenEditModal(topic)}
                      className="task-action-icon"
                      title="Editar Pauta"
                    >
                      <Pencil className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                    </button>
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="task-action-icon"
                      title="Excluir Pauta"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-700" />
                    </button>
                  </div>
                </div>

                <h4 className="topic-card-title">{topic.title}</h4>

                {topic.description && (
                  <p className="topic-card-desc">{topic.description}</p>
                )}
              </div>

              <div className="topic-card-footer">
                <span className="topic-author-text">
                  Sugerido por: <strong>{topic.created_by_name || 'usuario'}</strong>
                </span>

                <select
                  value={topic.status}
                  onChange={(e) =>
                    handleStatusChange(topic.id, e.target.value as MeetingTopicStatus)
                  }
                  className="topic-status-select"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_discussao">Em Discussão</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Recusado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}