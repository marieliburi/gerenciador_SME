import './styles/dashboard.css';
import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import AuthModal from './components/AuthModal';
import TaskModal from './components/TaskModal';
import type { Task } from './types/task';
import {
  LogOut,
  Loader2,
  Plus,
  CheckCircle2,
  SlidersHorizontal,
  Clock,
  GraduationCap,
  Trash2,
  RotateCcw,
  Check,
  Calendar,
  Pencil
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [viewCompletedOnly, setViewCompletedOnly] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!session?.user) return;
    setLoadingTasks(true);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Erro ao buscar tarefas:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchTasks();
    }
  }, [session, fetchTasks]);

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const isCompleted = task.status === 'completed';
    const message = isCompleted
      ? 'Deseja reabrir esta tarefa?'
      : 'Tem certeza que deseja concluir esta tarefa?';

    if (!confirm(message)) return;

    const newStatus = isCompleted ? 'todo' : 'completed';
    const completedAt = isCompleted ? null : new Date().toISOString();

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: completedAt,
        })
        .eq('id', task.id);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t
        )
      );
    } catch (err) {
      console.error('Erro ao alterar status da tarefa:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const getDaysRemainingText = (dueDateString?: string | null) => {
    if (!dueDateString) return null;
    
    const dueDate = new Date(dueDateString);
    const today = new Date();
    
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Atrasado há ${Math.abs(diffDays)} dia(s)`, isLate: true };
    } else if (diffDays === 0) {
      return { text: 'Vence hoje!', isLate: false };
    } else if (diffDays === 1) {
      return { text: 'Vence amanhã', isLate: false };
    } else {
      return { text: `Faltam ${diffDays} dias`, isLate: false };
    }
  };

  const toggleCardExpansion = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <AuthModal />;
  }

  const totalTasks = tasks.length;
  const userSupportTasks = tasks.filter(
    (t) => t.category === 'user_support' && t.status !== 'completed'
  );
  const systemUpdateTasks = tasks.filter(
    (t) => t.category === 'system_update' && t.status !== 'completed'
  );
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const getCardColorClass = (task: Task, index: number) => {
    if (task.card_color) return task.card_color;
    if (task.priority === 'high') return 'yellow';
    if (task.priority === 'low') return 'green';
    const palette = ['blue', 'purple', 'yellow'];
    return palette[index % palette.length];
  };

  return (
    <div className="dashboard-page">
      <header className="dash-header">
        <div className="dash-header-brand"></div>

        <div className="dash-header-actions">
          <button
            onClick={() => setViewCompletedOnly(!viewCompletedOnly)}
            className={`btn-concluidas ${viewCompletedOnly ? 'bg-slate-200' : ''}`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{viewCompletedOnly ? 'Ver Todas' : 'Concluídas'}</span>
          </button>

          <button onClick={handleOpenCreateModal} className="btn-nova-tarefa">
            <Plus className="w-4 h-4" />
            <span>Nova tarefa</span>
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="user-avatar-btn"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="dash-content">
        <h2 className="dash-page-title">Quadro de tarefas</h2>
        
        <div className="metrics-grid">
          <div className="metric-card">
            <div>
              <div className="metric-card-label">TAREFAS CRIADAS</div>
              <div className="metric-card-value">
                <span className="number">{totalTasks}</span>
                <span className="text">no total</span>
              </div>
            </div>
            <div className="metric-icon-box">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
          </div>

          <div className="metric-card">
            <div>
              <div className="metric-card-label">
                <span className="dot dot-blue"></span> ATENDIMENTO AO USUÁRIO
              </div>
              <div className="metric-card-value">
                <span className="number">{userSupportTasks.length}</span>
                <span className="text">chamados ativos</span>
              </div>
            </div>
            <div className="metric-icon-box blue">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="metric-card">
            <div>
              <div className="metric-card-label">
                <span className="dot dot-purple"></span> DEMANDA SIGUESCOLA
              </div>
              <div className="metric-card-value">
                <span className="number">{systemUpdateTasks.length}</span>
                <span className="text">demandas cadastradas</span>
              </div>
            </div>
            <div className="metric-icon-box purple">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {loadingTasks ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : viewCompletedOnly ? (
          <div className="kanban-column">
            <div className="column-banner completed">
              <div className="column-banner-title">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <h3>Tarefas Concluídas</h3>
                  <p>Histórico de demandas já finalizadas</p>
                </div>
              </div>
              <span className="badge-count">{completedTasks.length} tarefas</span>
            </div>

            <div className="task-list">
              {completedTasks.length === 0 ? (
                <div className="empty-task-state">Nenhuma tarefa concluída.</div>
              ) : (
                completedTasks.map((task) => (
                  <div key={task.id} className="task-card green opacity-85">
                    <div className="task-card-header">
                      <span className="task-tag">Concluído</span>
                      <div className="task-card-header-actions">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="task-action-icon"
                          title="Reabrir tarefa"
                        >
                          <RotateCcw className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="task-action-icon"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    <h4 className="task-card-title line-through">{task.title}</h4>
                    {task.description && <p className="task-card-desc">{task.description}</p>}

                    <div className="task-card-footer">
                      <span className="task-author">Finalizado</span>
                      <span className="task-author">{task.created_by_name || 'usuario'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="kanban-grid">
            {/* QUADRO 1: Atendimento ao usuário */}
            <div className="kanban-column">
              <div className="column-banner suporte">
                <div className="column-banner-title">
                  <Clock className="w-5 h-5" />
                  <div>
                    <h3>Atendimento ao usuário</h3>
                    <p>Suporte técnico aos operadores</p>
                  </div>
                </div>
                <div className="column-banner-actions">
                  <span className="badge-count">{userSupportTasks.length} tarefas</span>
                  <button onClick={handleOpenCreateModal} className="btn-add-column">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <div className="task-list">
                {userSupportTasks.length === 0 ? (
                  <div className="empty-task-state">Nenhum chamado ativo no momento.</div>
                ) : (
                  userSupportTasks.map((task, idx) => {
                    const colorClass = getCardColorClass(task, idx);
                    const isExpanded = expandedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleCardExpansion(task.id)}
                        className={`task-card ${colorClass} ${isExpanded ? 'expanded' : ''}`}
                      >
                        <div className="task-card-header">
                          <span className="task-tag">Chamado #{task.id.substring(0, 4)}</span>
                          <div
                            className="task-card-header-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEditModal(task)}
                              className="task-action-icon"
                              title="Editar tarefa"
                            >
                              <Pencil className="w-4 h-4 text-slate-600 hover:text-slate-900" />
                            </button>
                            <button
                              onClick={() => handleToggleComplete(task)}
                              className="task-action-icon"
                              title="Concluir tarefa"
                            >
                              <Check className="w-4 h-4 text-emerald-600 hover:text-emerald-800" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="task-action-icon"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>

                        <h4 className="task-card-title">{task.title}</h4>
                        {task.description && <p className="task-card-desc">{task.description}</p>}

                        <div className="task-card-footer">
                          <span
                            className={`priority-pill ${
                              task.priority === 'high'
                                ? 'high'
                                : task.priority === 'low'
                                ? 'low'
                                : 'medium'
                            }`}
                          >
                            {task.priority === 'high'
                              ? 'Alta prioridade'
                              : task.priority === 'low'
                              ? 'Baixa prioridade'
                              : 'Média prioridade'}
                          </span>
                          <span className="task-author">{task.created_by_name || 'usuario'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* QUADRO 2: Demanda Siguescola */}
            <div className="kanban-column">
              <div className="column-banner siguescola">
                <div className="column-banner-title">
                  <GraduationCap className="w-5 h-5" />
                  <div>
                    <h3>Demanda Siguescola</h3>
                    <p>Banco de dados e gestão acadêmica</p>
                  </div>
                </div>
                <div className="column-banner-actions">
                  <span className="badge-count">{systemUpdateTasks.length} tarefas</span>
                  <button onClick={handleOpenCreateModal} className="btn-add-column">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <div className="task-list">
                {systemUpdateTasks.length === 0 ? (
                  <div className="empty-task-state">Nenhuma demanda cadastrada no momento.</div>
                ) : (
                  systemUpdateTasks.map((task, idx) => {
                    const colorClass = getCardColorClass(task, idx + 1);
                    const isExpanded = expandedTaskId === task.id;
                    const daysInfo = getDaysRemainingText(task.due_date);

                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleCardExpansion(task.id)}
                        className={`task-card ${colorClass} ${isExpanded ? 'expanded' : ''}`}
                      >
                        <div className="task-card-header">
                          <span className="task-tag">
                            {task.category === 'system_update' ? 'Siguescola' : 'Interface'}
                          </span>
                          <div
                            className="task-card-header-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEditModal(task)}
                              className="task-action-icon"
                              title="Editar tarefa"
                            >
                              <Pencil className="w-4 h-4 text-slate-600 hover:text-slate-900" />
                            </button>
                            <button
                              onClick={() => handleToggleComplete(task)}
                              className="task-action-icon"
                              title="Concluir tarefa"
                            >
                              <Check className="w-4 h-4 text-emerald-600 hover:text-emerald-800" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="task-action-icon"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>

                        <h4 className="task-card-title">{task.title}</h4>
                        {task.description && <p className="task-card-desc">{task.description}</p>}

                        {/* EXIBIÇÃO DE PRAZO CONDICIONAL */}
                        {isExpanded && task.category === 'system_update' && (
                          <div className="task-card-expanded-details">
                            {task.due_date ? (
                              <div className="due-date-box">
                                <div className="due-date-info">
                                  <Calendar className="w-4 h-4 text-slate-500" />
                                  <span>
                                    Prazo:{' '}
                                    {new Date(task.due_date).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                {daysInfo && (
                                  <span
                                    className={`days-badge ${
                                      daysInfo.isLate ? 'late' : ''
                                    }`}
                                  >
                                    {daysInfo.text}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="due-date-box empty">
                                <span>Sem prazo de agendamento definido</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="task-card-footer">
                          <span
                            className={`priority-pill ${
                              task.priority === 'high'
                                ? 'high'
                                : task.priority === 'low'
                                ? 'low'
                                : 'medium'
                            }`}
                          >
                            {task.priority === 'high'
                              ? 'Alta prioridade'
                              : task.priority === 'low'
                              ? 'Baixa prioridade'
                              : 'Média prioridade'}
                          </span>
                          <span className="task-author">{task.created_by_name || 'usuario'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskCreated={fetchTasks}
        taskToEdit={taskToEdit}
      />
    </div>
  );
}