import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Task, TaskCategory, TaskPriority } from '../types/task';
import { X, Save, Loader2 } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  taskToEdit?: Task | null; // Tarefa enviada para edição (opcional)
}

export default function TaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  taskToEdit,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('user_support');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [cardColor, setCardColor] = useState<string>('yellow');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setCategory(taskToEdit.category || 'user_support');
      setPriority(taskToEdit.priority || 'medium');
      setCardColor(taskToEdit.card_color || 'yellow');

      // Formata a data ISO para YYYY-MM-DDTHH:mm para o input datetime-local
      if (taskToEdit.due_date) {
        const d = new Date(taskToEdit.due_date);
        const pad = (num: number) => String(num).padStart(2, '0');
        const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDueDate(formattedDate);
      } else {
        setDueDate('');
      }
    } else {
      // Reseta para novo registro
      setTitle('');
      setDescription('');
      setCategory('user_support');
      setPriority('medium');
      setCardColor('yellow');
      setDueDate('');
    }
  }, [taskToEdit, isOpen]);

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

      if (!user) {
        throw new Error('Usuário não autenticado.');
      }

      const authorName = user.email ? user.email.split('@')[0] : 'usuario';
      const finalDueDate =
        category === 'system_update' && dueDate ? new Date(dueDate).toISOString() : null;

      if (taskToEdit) {
        // ATUALIZAR TAREFA EXISTENTE
        const { error } = await supabase
          .from('tasks')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            category,
            priority,
            card_color: cardColor,
            due_date: finalDueDate,
          })
          .eq('id', taskToEdit.id);

        if (error) throw error;
      } else {
        // CRIAR NOVA TAREFA
        const { error } = await supabase.from('tasks').insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            category,
            status: 'todo',
            priority,
            card_color: cardColor,
            created_by: user.id,
            created_by_name: authorName,
            due_date: finalDueDate,
          },
        ]);

        if (error) throw error;
      }

      onTaskCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar a tarefa no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{taskToEdit ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h3>
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
            <label className="modal-label">Título da Tarefa *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Verificar erro no cadastro de alunos"
              className="modal-input"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Descrição</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes sobre a solicitação ou chamado..."
              className="modal-textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="modal-field">
              <label className="modal-label">Quadro / Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="modal-select"
              >
                <option value="user_support">Atendimento ao usuário</option>
                <option value="system_update">Demanda Siguescola</option>
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="modal-select"
              >
                <option value="low">Baixa prioridade</option>
                <option value="medium">Média prioridade</option>
                <option value="high">Alta prioridade</option>
              </select>
            </div>
          </div>

          {category === 'system_update' && (
            <div className="modal-field">
              <label className="modal-label">Prazo / Agendamento (Calendário)</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="modal-input"
              />
            </div>
          )}

          <div className="modal-field">
            <label className="modal-label">Cor do Card</label>
            <div className="color-picker-grid">
              {(['yellow', 'green', 'red', 'blue', 'purple'] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCardColor(color)}
                  className={`color-option ${color} ${cardColor === color ? 'selected' : ''}`}
                  title={`Cor ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-modal-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-modal-submit">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : taskToEdit ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              ) : (
                <>
                  <span>Criar Tarefa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}