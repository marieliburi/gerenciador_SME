// src/components/meetingTopicView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ListTodo,
  ArrowRight,
  Bold,
  Italic,
  List,
  ListOrdered
} from 'lucide-react';

import '../styles/meeting.css';

interface MeetingTopicsViewProps {
  onOpenCreateModal?: () => void;
  onOpenEditModal?: (topic: MeetingTopic) => void;
  onFetchTopicsRef?: (fetchFn: () => void) => void;
}

export default function MeetingTopicsView({ onFetchTopicsRef }: MeetingTopicsViewProps) {
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // Input para criar nova pendência na lista global
  const [newPendingText, setNewPendingText] = useState('');

  // Estados para o formulário de CRIAÇÃO de pauta
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [showPendingListInCreate, setShowPendingListInCreate] = useState(false);

  // Estados para o formulário de EDIÇÃO de pauta
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicDescription, setEditTopicDescription] = useState('');
  const [showPendingListInEdit, setShowPendingListInEdit] = useState(false);

  // Referências dos textareas para aplicar as formatações
  const createTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // 3. Inserir o texto da pendência na descrição da pauta em criação
  const handleAppendPendingToNewTopic = (content: string) => {
    setNewTopicDescription((prev) => {
      const currentText = prev.trim();
      return currentText ? `${currentText}\n• ${content}` : `• ${content}`;
    });
  };

  // 4. Inserir o texto da pendência na descrição da pauta em edição
  const handleAppendPendingToEditTopic = (content: string) => {
    setEditTopicDescription((prev) => {
      const currentText = prev.trim();
      return currentText ? `${currentText}\n• ${content}` : `• ${content}`;
    });
  };

  // Permite que a tecla Tab insira um recuo no textarea em vez de mudar de campo
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    currentText: string,
    setText: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault(); // Impede que o foco saia do textarea

      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Inserimos a tabulação (\t) ou 2 espaços ('  ') na posição do cursor
      const tabCharacter = '  '; // Recomendado 2 espaços para manter o padrão limpo, ou '\t'
      const newText =
        currentText.substring(0, start) + tabCharacter + currentText.substring(end);

      setText(newText);

      // Reposiciona o cursor após o caractere de tabulação inserido
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tabCharacter.length;
      }, 0);
    }
  };

  // 5. Funções de Formatação de Texto no Textarea (Criação e Edição)
  const applyFormatting = (
    type: 'bold' | 'italic' | 'bullet' | 'number',
    mode: 'create' | 'edit'
  ) => {
    const isEdit = mode === 'edit';
    const textarea = isEdit ? editTextareaRef.current : createTextareaRef.current;
    const currentText = isEdit ? editTopicDescription : newTopicDescription;
    const setText = isEdit ? setEditTopicDescription : setNewTopicDescription;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentText.substring(start, end);
    let replacement = '';
    let newCursorPos = start;

    switch (type) {
      case 'bold':
        replacement = `**${selectedText || 'texto em negrito'}**`;
        newCursorPos = selectedText ? end + 4 : start + 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'texto em itálico'}*`;
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case 'bullet':
        if (selectedText.includes('\n')) {
          replacement = selectedText.split('\n').map(line => `• ${line}`).join('\n');
        } else {
          replacement = `\n• ${selectedText || 'novo item'}`;
        }
        newCursorPos = start + replacement.length;
        break;
      case 'number':
        if (selectedText.includes('\n')) {
          replacement = selectedText.split('\n').map((line, idx) => `${idx + 1}. ${line}`).join('\n');
        } else {
          replacement = `\n1. ${selectedText || 'novo item'}`;
        }
        newCursorPos = start + replacement.length;
        break;
    }

    const newDescription =
      currentText.substring(0, start) + replacement + currentText.substring(end);

    setText(newDescription);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 6. Função para converter **negrito**, *itálico* e quebras de linha em elementos JSX na exibição
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    return text.split('\n').map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

      const formattedLine = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={partIdx}>{part.slice(1, -1)}</em>;
        }
        return part;
      });

      return (
        <React.Fragment key={lineIdx}>
          {formattedLine}
          {lineIdx < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // 7. Salvar a nova Pauta no banco de dados
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) {
      alert('Por favor, digite um título para a pauta.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('meeting_topics').insert([
        {
          title: newTopicTitle.trim(),
          description: newTopicDescription.trim(),
          status: 'active',
          created_by: user?.id,
          created_by_name: user?.email?.split('@')[0] || 'usuario',
        },
      ]);

      if (error) throw error;

      setNewTopicTitle('');
      setNewTopicDescription('');
      setIsCreatingTopic(false);
      setShowPendingListInCreate(false);
      await fetchData();
    } catch (err) {
      console.error('Erro ao criar pauta:', err);
      alert('Não foi possível criar a pauta.');
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Iniciar Edição de uma Pauta Existente
  const handleStartEditTopic = (topic: MeetingTopic) => {
    setIsCreatingTopic(false);
    setEditingTopicId(topic.id);
    setEditTopicTitle(topic.title);
    setEditTopicDescription(topic.description || '');
    setShowPendingListInEdit(false);
  };

  // 9. Salvar Edição da Pauta
  const handleSaveEditedTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopicId || !editTopicTitle.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('meeting_topics')
        .update({
          title: editTopicTitle.trim(),
          description: editTopicDescription.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTopicId);

      if (error) throw error;

      setEditingTopicId(null);
      setEditTopicTitle('');
      setEditTopicDescription('');
      setShowPendingListInEdit(false);
      await fetchData();
    } catch (err) {
      console.error('Erro ao editar pauta:', err);
      alert('Não foi possível salvar as alterações da pauta.');
    } finally {
      setSubmitting(false);
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
            <strong><h3 className="text-base font-bold text-slate-900">Lista de Pendências</h3></strong>
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

        {/* BOTÃO "NOVA PAUTA" QUE ABRE O FORMULÁRIO */}
        <button
          onClick={() => {
            setEditingTopicId(null);
            setIsCreatingTopic(!isCreatingTopic);
          }}
          className="btn-topic-primary"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreatingTopic ? 'Cancelar' : 'Nova Pauta'}</span>
        </button>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO DE PAUTA */}
      {isCreatingTopic && (
        <div className="create-topic-card">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            Criar Nova Pauta
          </h3>

          <form onSubmit={handleCreateTopic} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Título:</label>
              <input
                type="text"
                placeholder="Título da Pauta..."
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="topic-item-input"
                required
              />
            </div>

            <div className="form-group">
              <div className="label-with-button">
                <label className="form-label mb-0">Descrição / Conteúdo:</label>

                <button
                  type="button"
                  onClick={() => setShowPendingListInCreate(!showPendingListInCreate)}
                  className="btn-pending-toggle"
                >
                  <ListTodo className="h-4 w-4" />
                  <span>{showPendingListInCreate ? 'Ocultar pendências' : 'Ver lista de pendências'}</span>
                </button>
              </div>

              {showPendingListInCreate && (
                <div className="pending-selector-box">
                  <span className="pending-selector-title">
                    Clique em Inserir para adicionar o texto da pendência no corpo da pauta:
                  </span>

                  {pendingItems.length === 0 ? (
                    <p className="text-xs italic text-slate-400 py-2 text-center">
                      Nenhuma pendência cadastrada na lista.
                    </p>
                  ) : (
                    <div className="pending-selector-list">
                      {pendingItems.map((item) => (
                        <div key={item.id} className="pending-selector-item">
                          <span className="pending-item-text">{item.content}</span>
                          <button
                            type="button"
                            onClick={() => handleAppendPendingToNewTopic(item.content)}
                            className="btn-insert-pending"
                            title="Inserir na pauta"
                          >
                            <span>Inserir</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="text-editor-container">
                <div className="text-editor-toolbar">
                  <button
                    type="button"
                    onClick={() => applyFormatting('bold', 'create')}
                    className="toolbar-btn"
                    title="Negrito"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('italic', 'create')}
                    className="toolbar-btn"
                    title="Itálico"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <div className="toolbar-divider" />
                  <button
                    type="button"
                    onClick={() => applyFormatting('bullet', 'create')}
                    className="toolbar-btn"
                    title="Lista com Marcadores"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('number', 'create')}
                    className="toolbar-btn"
                    title="Lista Numerada"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </button>
                </div>

                <textarea
                  ref={createTextareaRef}
                  rows={6}
                  placeholder="Digite o conteúdo da pauta ou insira pendências da lista acima..."
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, newTopicDescription, setNewTopicDescription)} // 👈 Adicionado aqui
                  className="topic-textarea w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingTopic(false)}
                className="btn-cancel-topic"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-save-topic"
              >
                <span>Salvar Pauta</span>
              </button>
            </div>
          </form>
        </div>
      )}

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
              {activeTopics.map((topic) => {
                const isEditingThis = editingTopicId === topic.id;

                if (isEditingThis) {
                  return (
                    <div key={topic.id} className="create-topic-card col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <strong><h3 className="text-base font-bold text-slate-900">
                          Editar Pauta
                        </h3></strong>

                      </div>

                      <form onSubmit={handleSaveEditedTopic} className="space-y-4 mt-2">
                        <div className="form-group">
                          <label className="form-label">Título:</label>
                          <input
                            type="text"
                            value={editTopicTitle}
                            onChange={(e) => setEditTopicTitle(e.target.value)}
                            className="topic-item-input"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <div className="label-with-button">
                            <label className="form-label mb-0">Descrição / Conteúdo:</label>

                            <button
                              type="button"
                              onClick={() => setShowPendingListInEdit(!showPendingListInEdit)}
                              className="btn-pending-toggle"
                            >
                              <ListTodo className="h-4 w-4" />
                              <span>{showPendingListInEdit ? 'Ocultar pendências' : 'Ver lista de pendências'}</span>
                            </button>
                          </div>

                          {showPendingListInEdit && (
                            <div className="pending-selector-box">
                              <span className="pending-selector-title">
                                Clique em Inserir para adicionar a pendência à pauta:
                              </span>

                              {pendingItems.length === 0 ? (
                                <p className="text-xs italic text-slate-400 py-2 text-center">
                                  Nenhuma pendência cadastrada na lista.
                                </p>
                              ) : (
                                <div className="pending-selector-list">
                                  {pendingItems.map((item) => (
                                    <div key={item.id} className="pending-selector-item">
                                      <span className="pending-item-text">{item.content}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleAppendPendingToEditTopic(item.content)}
                                        className="btn-insert-pending"
                                        title="Inserir na pauta"
                                      >
                                        <span>Inserir</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="text-editor-container">
                            <div className="text-editor-toolbar">
                              <button
                                type="button"
                                onClick={() => applyFormatting('bold', 'edit')}
                                className="toolbar-btn"
                                title="Negrito"
                              >
                                <Bold className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => applyFormatting('italic', 'edit')}
                                className="toolbar-btn"
                                title="Itálico"
                              >
                                <Italic className="h-4 w-4" />
                              </button>
                              <div className="toolbar-divider" />
                              <button
                                type="button"
                                onClick={() => applyFormatting('bullet', 'edit')}
                                className="toolbar-btn"
                                title="Lista com Marcadores"
                              >
                                <List className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => applyFormatting('number', 'edit')}
                                className="toolbar-btn"
                                title="Lista Numerada"
                              >
                                <ListOrdered className="h-4 w-4" />
                              </button>
                            </div>

                            <textarea
                              ref={editTextareaRef}
                              rows={6}
                              value={editTopicDescription}
                              onChange={(e) => setEditTopicDescription(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, editTopicDescription, setEditTopicDescription)} // 👈 Adicionado aqui
                              className="topic-textarea w-full"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingTopicId(null)}
                            className="btn-cancel-topic"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="btn-save-topic"
                          >
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div key={topic.id} className="topic-active-card">
                    <div className="topic-active-header">
                      <h3 className="topic-active-title">{topic.title}</h3>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditTopic(topic)}
                          className="btn-editar-icon"
                          title="Editar Pauta"
                        >
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleToggleTopicStatus(topic)}
                          className="btn-concluir-icon hover:text-emerald-600"
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

                    {/* Conteúdo com renderização de negrito/itálico */}
                    <div className="p-4 bg-white flex-1">
                      {topic.description ? (
                        <p className="topic-card-text">
                          {renderFormattedText(topic.description)}
                        </p>
                      ) : (
                        <span className="text-slate-400 text-sm italic">Sem conteúdo nesta pauta.</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
                    <p className="topic-card-text">
                      {renderFormattedText(topic.description ?? '')}
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