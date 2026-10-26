// src/components/meetingTopicView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MeetingTopic, MeetingTopicItem } from '../types/meetingTopic';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  CheckCircle2, 
  Circle, 
  FolderPlus, 
  Loader2,
  RotateCcw
} from 'lucide-react';

import '../styles/meeting.css';

interface MeetingTopicsViewProps {
  onOpenCreateModal?: () => void;
  onOpenEditModal?: (topic: MeetingTopic) => void;
  onFetchTopicsRef?: (fetchFn: () => void) => void;
}

export default function MeetingTopicsView({ onFetchTopicsRef }: MeetingTopicsViewProps) {
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [newItemText, setNewItemText] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingItem, setSubmittingItem] = useState(false);

  // Sub-aba interna: 'active' (Em Andamento) | 'completed' (Concluídas)
  const [topicTab, setTopicTab] = useState<'active' | 'completed'>('active');

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from('meeting_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;

      if (topicsData && topicsData.length > 0) {
        const topicIds = topicsData.map(t => t.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('meeting_topic_items')
          .select('*')
          .in('topic_id', topicIds)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;

        const formattedTopics: MeetingTopic[] = topicsData.map(topic => ({
          ...topic,
          items: (itemsData || []).filter(item => item.topic_id === topic.id)
        }));

        setTopics(formattedTopics);

        if (!selectedTopicId && formattedTopics.length > 0) {
          setSelectedTopicId(formattedTopics[0].id);
        }
      } else {
        setTopics([]);
      }
    } catch (err) {
      console.error('Erro ao carregar pautas e itens:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTopicId]);

  useEffect(() => {
    fetchTopics();
    if (onFetchTopicsRef) {
      onFetchTopicsRef(fetchTopics);
    }
  }, [fetchTopics, onFetchTopicsRef]);

  // Função auxiliar para verificar se uma pauta está concluída (tem itens e todos estão checados)
  const isTopicCompleted = (topic: MeetingTopic) => {
    if (!topic.items || topic.items.length === 0) return false;
    return topic.items.every(i => i.is_completed);
  };

  // Separação das pautas ativas e concluídas
  const activeTopics = topics.filter(t => !isTopicCompleted(t));
  const completedTopics = topics.filter(t => isTopicCompleted(t));

  // Criar Nova Pauta
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('meeting_topics')
        .insert([
          { 
            title: newTopicTitle.trim(),
            created_by: user?.id,
            created_by_name: user?.email?.split('@')[0] || 'usuario'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setNewTopicTitle('');
      setIsCreatingTopic(false);
      await fetchTopics();
      if (data) setSelectedTopicId(data.id);
    } catch (err) {
      console.error('Erro ao criar pauta:', err);
    }
  };

  // Adicionar Item/Assunto
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !selectedTopicId) return;

    setSubmittingItem(true);
    try {
      const { error } = await supabase
        .from('meeting_topic_items')
        .insert([
          {
            topic_id: selectedTopicId,
            content: newItemText.trim(),
            is_completed: false
          }
        ]);

      if (error) throw error;

      setNewItemText('');
      await fetchTopics();
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    } finally {
      setSubmittingItem(false);
    }
  };

  // Marcar / Desmarcar Item
  const handleToggleItemStatus = async (item: MeetingTopicItem) => {
    try {
      const { error } = await supabase
        .from('meeting_topic_items')
        .update({ is_completed: !item.is_completed })
        .eq('id', item.id);

      if (error) throw error;

      setTopics(prev =>
        prev.map(topic => {
          if (topic.id !== item.topic_id) return topic;
          return {
            ...topic,
            items: topic.items?.map(i =>
              i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
            )
          };
        })
      );
    } catch (err) {
      console.error('Erro ao alterar status do item:', err);
    }
  };

  // Desmarcar TODOS os itens para reabrir a pauta
  const handleReopenTopic = async (topic: MeetingTopic) => {
    if (!confirm('Deseja reabrir esta pauta? Todos os itens voltarão ao estado pendente.')) return;

    try {
      const itemIds = (topic.items || []).map(i => i.id);
      if (itemIds.length === 0) return;

      const { error } = await supabase
        .from('meeting_topic_items')
        .update({ is_completed: false })
        .in('id', itemIds);

      if (error) throw error;

      await fetchTopics();
    } catch (err) {
      console.error('Erro ao reabrir pauta:', err);
    }
  };

  // Excluir Item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_topic_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setTopics(prev =>
        prev.map(topic => ({
          ...topic,
          items: topic.items?.filter(i => i.id !== itemId)
        }))
      );
    } catch (err) {
      console.error('Erro ao deletar item:', err);
    }
  };

  // Excluir Pauta Completa
  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pauta e todos os seus itens?')) return;

    try {
      const { error } = await supabase
        .from('meeting_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      const remainingTopics = topics.filter(t => t.id !== topicId);
      setTopics(remainingTopics);
      setSelectedTopicId(remainingTopics.length > 0 ? remainingTopics[0].id : '');
    } catch (err) {
      console.error('Erro ao deletar pauta:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="topics-container">
      {/* NAVEGAÇÃO DE SUB-ABAS (EM ANDAMENTO x CONCLUÍDAS) */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="dash-page-title mb-0">Pautas de Reunião</h2>

        <div className="task-tabs-container">
          <button
            onClick={() => setTopicTab('active')}
            className={`task-tab-btn ${topicTab === 'active' ? 'active' : ''}`}
          >
            Em Andamento ({activeTopics.length})
          </button>

          <button
            onClick={() => setTopicTab('completed')}
            className={`task-tab-btn ${topicTab === 'completed' ? 'active' : ''}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 icon-emerald" />
            <span>Concluídas ({completedTopics.length})</span>
          </button>
        </div>
      </div>

      {/* ABA 1: PAUTAS EM ANDAMENTO */}
      {topicTab === 'active' && (
        <>
          {/* PAINEL SUPERIOR: SELECIONAR PAUTA + ADICIONAR ITEM / CRIAR PAUTA */}
          <div className="topic-selector-card">
            <div className="topic-selector-header">
              <div className="topic-select-group">
                <label className="topic-select-label">Adicionar item na Pauta:</label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="topic-select-input"
                >
                  {activeTopics.length === 0 ? (
                    <option value="">Nenhuma pauta ativa</option>
                  ) : (
                    activeTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.items?.filter(i => !i.is_completed).length || 0} pendentes)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                onClick={() => setIsCreatingTopic(!isCreatingTopic)}
                className="btn-topic-primary"
              >
                <FolderPlus className="h-4 w-4" />
                <span>{isCreatingTopic ? 'Cancelar' : 'Nova Pauta'}</span>
              </button>
            </div>

            {/* Form para Criar Nova Pauta */}
            {isCreatingTopic && (
              <form onSubmit={handleCreateTopic} className="topic-create-form">
                <input
                  type="text"
                  placeholder="Nome da pauta (ex: Reunião Semanal, Diretoria...)"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="topic-create-input"
                  autoFocus
                />
                <button type="submit" className="btn-add-item">
                  Criar
                </button>
              </form>
            )}

            {/* Input Rápido para a Pauta Selecionada */}
            {activeTopics.length > 0 && (
              <form onSubmit={handleAddItem} className="topic-item-form border-t border-slate-100 pt-3 mt-1">
                <input
                  type="text"
                  placeholder="Digite o item para adicionar na pauta selecionada acima... (Pressione Enter)"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  disabled={submittingItem}
                  className="topic-item-input"
                />
                <button
                  type="submit"
                  disabled={submittingItem || !newItemText.trim() || !selectedTopicId}
                  className="btn-add-item"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar</span>
                </button>
              </form>
            )}
          </div>

          {/* GRADE DE PAUTAS ATIVAS */}
          {activeTopics.length === 0 ? (
            <div className="topics-empty-state">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nenhuma pauta em andamento</p>
              <p className="text-xs text-slate-400 mt-1">
                Todas as pautas foram concluídas ou nenhuma foi criada ainda.
              </p>
            </div>
          ) : (
            <div className="topics-grid">
              {activeTopics.map((topic) => {
                const pendingCount = topic.items?.filter(i => !i.is_completed).length || 0;
                const completedCount = topic.items?.filter(i => i.is_completed).length || 0;

                return (
                  <div key={topic.id} className="topic-active-card">
                    <div className="topic-active-header">
                      <div>
                        <h3 className="topic-active-title">{topic.title}</h3>
                        <p className="topic-active-author">
                          {pendingCount} pendentes • {completedCount} concluídos
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="btn-delete-icon"
                        title="Excluir Pauta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="topic-items-list">
                      {(!topic.items || topic.items.length === 0) ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                          Nenhum item adicionado nesta pauta.
                        </div>
                      ) : (
                        topic.items.map((item) => (
                          <div
                            key={item.id}
                            className={`topic-item-row ${item.is_completed ? 'completed' : ''}`}
                          >
                            <button
                              onClick={() => handleToggleItemStatus(item)}
                              className="topic-item-button"
                            >
                              {item.is_completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                              )}
                              <span className={`topic-item-text ${item.is_completed ? 'done' : ''}`}>
                                {item.content}
                              </span>
                            </button>

                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="btn-delete-icon"
                              title="Excluir item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ABA 2: PAUTAS CONCLUÍDAS */}
      {topicTab === 'completed' && (
        <div className="max-w-2xl mx-auto w-full">
          {completedTopics.length === 0 ? (
            <div className="topics-empty-state">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nenhuma pauta concluída no momento</p>
              <p className="text-xs text-slate-400 mt-1">
                Quando todos os itens de uma pauta forem marcados, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTopics.map((topic) => (
                <div key={topic.id} className="topic-active-card opacity-90">
                  <div className="topic-active-header bg-emerald-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded">
                          Concluído
                        </span>
                        <h3 className="topic-active-title line-through text-slate-600">
                          {topic.title}
                        </h3>
                      </div>
                      <p className="topic-active-author mt-1">
                        Todos os {topic.items?.length || 0} itens foram finalizados
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReopenTopic(topic)}
                        className="btn-delete-icon hover:text-blue-600"
                        title="Reabrir Pauta"
                      >
                        <RotateCcw className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="btn-delete-icon"
                        title="Excluir Pauta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="topic-items-list">
                    {topic.items?.map((item) => (
                      <div key={item.id} className="topic-item-row completed">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <span className="topic-item-text done">{item.content}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}