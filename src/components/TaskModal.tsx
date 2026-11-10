import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Loader2, Check } from 'lucide-react';
import type { Task } from '../types/task';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  taskToEdit?: Task | null;
}

export default function TaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  taskToEdit,
}: TaskModalProps) {
  const [category, setCategory] = useState<'tarefa' | 'demanda'>('tarefa');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setCategory(taskToEdit.category || 'tarefa');
      setDescription(taskToEdit.description || taskToEdit.title || '');
      setDueDate(taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '');
      setPriority(taskToEdit.priority || 'medium');
    } else {
      setCategory('tarefa');
      setDescription('');
      setDueDate('');
      setPriority('medium');
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);

    try {
      const formattedDueDate = dueDate ? new Date(dueDate).toISOString() : null;
      const titleText = description.length > 50 ? description.substring(0, 47) + '...' : description;

      if (taskToEdit) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: titleText,
            description: description.trim(),
            category,
            due_date: formattedDueDate,
            priority,
          })
          .eq('id', taskToEdit.id);

        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const username = userData.user?.email?.split('@')[0] || 'usuario';

        const { error } = await supabase.from('tasks').insert({
          title: titleText,
          description: description.trim(),
          category,
          due_date: formattedDueDate,
          priority,
          status: 'todo',
          created_by_name: username,
        });

        if (error) throw error;
      }

      onTaskCreated();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar item:', err);
      alert('Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{taskToEdit ? 'Editar Item' : 'Criar Novo Item'}</h3>
          <button type="button" onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label className="modal-label">Tipo de Item</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('tarefa')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border ${
                  category === 'tarefa'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Tarefa
              </button>
              <button
                type="button"
                onClick={() => setCategory('demanda')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border ${
                  category === 'demanda'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Demanda 
              </button>
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">Descrição *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="modal-textarea"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Data de Vencimento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'low'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Baixa
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'medium'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Média
              </button>
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'high'
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Alta
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-modal-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-modal-submit">
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>
                  <Check size={16} />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}