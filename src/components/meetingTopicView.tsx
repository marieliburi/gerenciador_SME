// src/components/meetingTopicView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MeetingTopic, PendingItem } from '../types/meetingTopic';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  CheckCircle2, 
  Loader2, 
  Pencil,
  RotateCcw,
  ListTodo
} from 'lucide-react';

import '../styles/meeting.css';

interface MeetingTopicsViewProps {
  onOpenCreateModal?: () => void;
  onOpenEditModal?: (topic: MeetingTopic) => void;
  onFetchTopicsRef?: (fetchFn: () => void) => void;
}

export default function MeetingTopicsView({ onOpenCreateModal, onOpenEditModal, onFetchTopicsRef }: MeetingTopicsViewProps) {
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  
  // Input para criar nova pendência
  const [newPendingText, setNewPendingText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Sub-aba interna do Quadro de Pautas: 'active' | 'completed'
  const [topicTab, setTopicTab] = useState<'active' | 'completed'>('active');

  // Buscando pautas e itens da lista de pendências
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca Pautas
      const { data: topicsData, error: topicsError } = await supabase
        .from('meeting_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);

      // 2. Busca Itens de Pendências
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setPendingItems(pendingData || []);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (onFetchTopicsRef) {
      onFetchTopicsRef(fetchData);
    }
  }, [fetchData, onFetchTopicsRef]);

  // Separação entre Pautas Ativas e Concluídas
  const activeTopics = topics.filter(t => t.status !== 'completed');
  const completedTopics = topics.filter(t => t.status === 'completed');

  // 1. Criar novo Item na Lista de Pendências
  const handleAddPendingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPendingText.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('pending_items').insert([
        { content: newPendingText.trim(), created_by: user?.id }
      ]);

      if (error) throw error;

      setNewPendingText('');
      await fetchData();
    } catch (err) {
      console.error('Erro ao criar pendência:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Apagar Item da Lista de Pendências Manualmente
  const handleDeletePendingItem = async (id: string) => {
    try {
      const { error } = await supabase.from('pending_items').delete().eq('id', id);
      if (error) throw error;
      setPendingItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erro ao deletar pendência:', err);
    }
  };

  // Alterar Status da Pauta (Concluir / Reabrir)
  const handleToggleTopicStatus = async (topic: MeetingTopic) => {
    const isCompleted = topic.status === 'completed';
    const newStatus = isCompleted ? 'active' : 'completed';

    try {
      const { error } = await supabase
        .from('meeting_topics')
        .update({ status: newStatus })
        .eq('id', topic.id);

      if (error) throw error;

      setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Erro ao alterar status da pauta:', err);
    }
  };

  // Excluir Pauta
  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pauta?')) return;

    try {
      const { error } = await supabase.from('meeting_topics').delete().eq('id', topicId);
      if (error) throw error;

      setTopics(prev => prev.filter(t => t.id !== topicId));
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
      {/* 1. PAINEL DA LISTA DE PENDÊNCIAS (ISOLADA NO TOPO) */}
      <div className="topic-pending-panel">
        <div className="topic-pending-header">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">Lista de Pendências</h3>
          </div>
        </div>

        {/* Input para adicionar nova pendência */}
        <form onSubmit={handleAddPendingItem} className="topic-item-form mt-3">
          <input
            type="text"
            placeholder="Digite uma nova pendência... (Pressione Enter)"
            value={newPendingText}
            onChange={(e) => setNewPendingText(e.target.value)}
            disabled={submitting}
            className="topic-item-input"
          />
          <button
            type="submit"
            disabled={submitting || !newPendingText.trim()}
            className="btn-add-item"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar</span>
          </button>
        </form>

        {/* Lista de itens pendentes */}
        <div className="topic-items-list mt-3">
          {pendingItems.length === 0 ? (
            <div className="p-3 text-slate-400 text-xs italic text-center border-t border-slate-100 pt-3">
              Nenhuma pendência cadastrada na lista.
            </div>
          ) : (
            pendingItems.map((item) => (
              <div key={item.id} className="topic-item-row">
                <span className="topic-item-text">{item.content}</span>

                <button
                  onClick={() => handleDeletePendingItem(item.id)}
                  className="btn-delete-icon"
                  title="Excluir item da lista"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. BARRA DE TÍTULO + SUB-ABAS (ESQUERDA) E BOTÃO "NOVA PAUTA" (DIREITA) */}
      <div className="topics-header-bar">
        <div className="flex items-center gap-4">
          <h2 className="dash-page-title mb-0">Quadro de Pautas</h2>

          {/* SUB-ABAS DE NAVEGAÇÃO DE PAUTAS */}
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

        {/* BOTÃO "NOVA PAUTA" ALINHADO À DIREITA */}
        {onOpenCreateModal && (
          <button onClick={onOpenCreateModal} className="btn-topic-primary">
            <Plus className="h-4 w-4" />
            <span>Nova Pauta</span>
          </button>
        )}
      </div>

      {/* 3. CONTEÚDO DAS PAUTAS (EM ANDAMENTO x CONCLUÍDAS) */}
      {topicTab === 'active' && (
        <>
          {activeTopics.length === 0 ? (
            <div className="topics-empty-state">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nenhuma pauta em andamento</p>
            </div>
          ) : (
            <div className="topics-grid">
              {activeTopics.map((topic) => (
                <div key={topic.id} className="topic-active-card">
                  <div className="topic-active-header">
                    <h3 className="topic-active-title">{topic.title}</h3>

                    <div className="flex items-center gap-1">
                      {onOpenEditModal && (
                        <button
                          onClick={() => onOpenEditModal(topic)}
                          className="btn-delete-icon"
                          title="Editar Pauta"
                        >
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleTopicStatus(topic)}
                        className="btn-delete-icon hover:text-emerald-600"
                        title="Concluir Pauta"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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

                  {/* Conteúdo em texto simples da pauta (com suporte a quebra de linha) */}
                  <div className="p-4 bg-white flex-1">
                    {topic.description ? (
                      <p className="topic-card-text">
                        {topic.description}
                      </p>
                    ) : (
                      <span className="text-slate-400 text-sm italic">Sem conteúdo nesta pauta.</span>
                    )}
                  </div>

                  
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ABA DE CONCLUÍDAS */}
      {topicTab === 'completed' && (
        <div className="max-w-2xl mx-auto w-full">
          {completedTopics.length === 0 ? (
            <div className="topics-empty-state">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nenhuma pauta concluída no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTopics.map((topic) => (
                <div key={topic.id} className="topic-active-card opacity-90">
                  <div className="topic-active-header bg-emerald-50/50">
                    <div>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded mr-2">
                        Concluído
                      </span>
                      <h3 className="topic-active-title inline line-through text-slate-600">
                        {topic.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleTopicStatus(topic)}
                        className="btn-delete-icon"
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

                  <div className="p-4">
                    <p className="topic-card-text text-slate-600">
                      {topic.description}
                    </p>
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