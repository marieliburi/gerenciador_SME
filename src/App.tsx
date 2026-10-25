import './styles/dashboard.css';
import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import AuthModal from './components/AuthModal';
import FirstAccessPassword from './components/FirstAccessPassword';
import TaskModal from './components/TaskModal';
import type { Task } from './types/task';
import MeetingTopicsView from './components/meetingTopicView';
import MeetingTopicModal from './components/meetingTopicModel';
import type { MeetingTopic } from './types/meetingTopic';
import NotesView from './components/NotesView';
import { StickyNote } from 'lucide-react';
import {
  MessageSquare,
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
  Pencil,
  User,
  LayoutGrid,
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Navegação de telas
  const [activeNav, setActiveNav] = useState<
    'kanban' | 'meeting_topics' | 'completed' | 'notes'
  >('kanban');

  // Estado das pautas
  const [isMeetingTopicModalOpen, setIsMeetingTopicModalOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<MeetingTopic | null>(null);
  const [fetchMeetingTopicsFn, setFetchMeetingTopicsFn] = useState<
    (() => void) | null
  >(null);

  useEffect(() => {
    let mounted = true;

    const applySession = (newSession: Session | null) => {
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (error) {
        console.error('Erro ao recuperar sessão:', error);
      }
      applySession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!session?.user) {
      setTasks([]);
      return;
    }

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
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) {
      void fetchTasks();
    } else {
      setTasks([]);
    }
  }, [session, fetchTasks]);

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
      alert('Não foi possível excluir a tarefa.');
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
        prev.map((item) =>
          item.id === task.id
            ? { ...item, status: newStatus, completed_at: completedAt }
            : item,
        ),
      );
    } catch (err) {
      console.error('Erro ao alterar status da tarefa:', err);
      alert('Não foi possível alterar o status da tarefa.');
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
    }
    if (diffDays === 0) {
      return { text: 'Vence hoje!', isLate: false };
    }
    if (diffDays === 1) {
      return { text: 'Vence amanhã', isLate: false };
    }
    return { text: `Faltam ${diffDays} dias`, isLate: false };
  };

  const toggleCardExpansion = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <AuthModal />;
  }

  // A conta precisa ter sido criada pelo administrador com este metadado:
  // user_metadata.must_change_password = true
  // Após a definição da senha, FirstAccessPassword altera esse valor para false.
  if (session.user.user_metadata?.must_change_password === true) {
    return (
      <FirstAccessPassword
        onPasswordChanged={async () => {
          const { data, error } = await supabase.auth.getUser();

          if (error || !data.user) {
            console.error('Não foi possível atualizar os dados do usuário:', error);
            return;
          }

          setSession((current) => {
            if (!current) return current;
            return { ...current, user: data.user };
          });
        }}
      />
    );
  }

  const currentUserName = session.user.email?.split('@')[0] || 'usuario';

  const totalTasks = tasks.length;
  const userSupportTasks = tasks.filter(
    (task) => task.category === 'user_support' && task.status !== 'completed',
  );
  const systemUpdateTasks = tasks.filter(
    (task) => task.category === 'system_update' && task.status !== 'completed',
  );
  const completedTasks = tasks.filter((task) => task.status === 'completed');

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
        <div className="dash-header-container">
          <div className="dash-user-badge">
            <User className="h-4 w-4 text-slate-500" />
            <span>{currentUserName}</span>
          </div>

          <div className="dash-header-right">
            <nav className="dash-nav-links">
              <button
                onClick={() => setActiveNav('kanban')}
                className={`nav-link ${activeNav === 'kanban' ? 'active-black' : ''}`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Quadro</span>
              </button>

              <button
                onClick={() => setActiveNav('meeting_topics')}
                className={`nav-link ${activeNav === 'meeting_topics' ? 'active-black' : ''}`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Pautas</span>
              </button>

              <button
                onClick={() => setActiveNav('notes')}
                className={`nav-link ${activeNav === 'notes' ? 'active-black' : ''}`}
              >
                <StickyNote className="h-4 w-4" />
                <span>Notas</span>
              </button>

              <button
                onClick={() => setActiveNav('completed')}
                className={`nav-link ${activeNav === 'completed' ? 'active-black' : ''}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Concluídas ({completedTasks.length})</span>
              </button>
            </nav>

            <button
              onClick={() => void supabase.auth.signOut()}
              className="btn-logout"
              title="Sair da conta"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="dash-content">
        {activeNav === 'meeting_topics' && (
          <MeetingTopicsView
            onOpenCreateModal={() => {
              setTopicToEdit(null);
              setIsMeetingTopicModalOpen(true);
            }}
            onOpenEditModal={(topic) => {
              setTopicToEdit(topic);
              setIsMeetingTopicModalOpen(true);
            }}
            onFetchTopicsRef={(fetchFn) => setFetchMeetingTopicsFn(() => fetchFn)}
          />
        )}

        {activeNav === 'notes' && <NotesView />}

        {activeNav === 'completed' && (
          <div className="kanban-column">
            <div className="column-banner completed">
              <div className="column-banner-title">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <h3>Tarefas Concluídas</h3>
                  <p>Histórico de demandas já finalizadas</p>
                </div>
              </div>
              <span className="badge-count">{completedTasks.length} tarefas</span>
            </div>

            <div className="task-list">
              {completedTasks.length === 0 ? (
                <div className="empty-task-state">
                  Nenhuma tarefa concluída no momento.
                </div>
              ) : (
                completedTasks.map((task) => (
                  <div key={task.id} className="task-card green opacity-85">
                    <div className="task-card-header">
                      <span className="task-tag">Concluído</span>
                      <div className="task-card-header-actions">
                        <button
                          onClick={() => void handleToggleComplete(task)}
                          className="task-action-icon"
                          title="Reabrir tarefa"
                        >
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => void handleDeleteTask(task.id)}
                          className="task-action-icon"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    <h4 className="task-card-title line-through">{task.title}</h4>
                    {task.description && (
                      <p className="task-card-desc">{task.description}</p>
                    )}

                    <div className="task-card-footer">
                      <span className="task-author">Finalizado</span>
                      <span className="task-author">
                        {task.created_by_name || 'usuario'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeNav === 'kanban' && (
          <>
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
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
              </div>

              <div className="metric-card">
                <div>
                  <div className="metric-card-label">
                    <span className="dot dot-blue" /> ATENDIMENTO AO USUÁRIO
                  </div>
                  <div className="metric-card-value">
                    <span className="number">{userSupportTasks.length}</span>
                    <span className="text">chamados ativos</span>
                  </div>
                </div>
                <div className="metric-icon-box blue">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="metric-card">
                <div>
                  <div className="metric-card-label">
                    <span className="dot dot-purple" /> DEMANDA SIGUESCOLA
                  </div>
                  <div className="metric-card-value">
                    <span className="number">{systemUpdateTasks.length}</span>
                    <span className="text">demandas cadastradas</span>
                  </div>
                </div>
                <div className="metric-icon-box purple">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
            </div>

            {loadingTasks ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="kanban-grid">
                <div className="kanban-column">
                  <div className="column-banner suporte">
                    <div className="column-banner-title">
                      <Clock className="h-5 w-5" />
                      <div>
                        <h3>Atendimento ao usuário</h3>
                      </div>
                    </div>
                    <div className="column-banner-actions">
                      <span className="badge-count">{userSupportTasks.length} tarefas</span>
                      <button onClick={handleOpenCreateModal} className="btn-add-column">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>

                  <div className="task-list">
                    {userSupportTasks.length === 0 ? (
                      <div className="empty-task-state">
                        Nenhum chamado ativo no momento.
                      </div>
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
                              <span className="task-tag">
                                Chamado #{task.id.substring(0, 4)}
                              </span>
                              <div
                                className="task-card-header-actions"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="task-action-icon"
                                  title="Editar tarefa"
                                >
                                  <Pencil className="h-4 w-4 text-slate-600 hover:text-slate-900" />
                                </button>
                                <button
                                  onClick={() => void handleToggleComplete(task)}
                                  className="task-action-icon"
                                  title="Concluir tarefa"
                                >
                                  <Check className="h-4 w-4 text-emerald-600 hover:text-emerald-800" />
                                </button>
                                <button
                                  onClick={() => void handleDeleteTask(task.id)}
                                  className="task-action-icon"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            </div>

                            <h4 className="task-card-title">{task.title}</h4>
                            {task.description && (
                              <p className="task-card-desc">{task.description}</p>
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
                              <span className="task-author">
                                {task.created_by_name || 'usuario'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="kanban-column">
                  <div className="column-banner siguescola">
                    <div className="column-banner-title">
                      <GraduationCap className="h-5 w-5" />
                      <div>
                        <h3>Demanda Siguescola</h3>
                      </div>
                    </div>
                    <div className="column-banner-actions">
                      <span className="badge-count">{systemUpdateTasks.length} tarefas</span>
                      <button onClick={handleOpenCreateModal} className="btn-add-column">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>

                  <div className="task-list">
                    {systemUpdateTasks.length === 0 ? (
                      <div className="empty-task-state">
                        Nenhuma demanda cadastrada no momento.
                      </div>
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
                                {task.category === 'system_update'
                                  ? 'Siguescola'
                                  : 'Interface'}
                              </span>
                              <div
                                className="task-card-header-actions"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="task-action-icon"
                                  title="Editar tarefa"
                                >
                                  <Pencil className="h-4 w-4 text-slate-600 hover:text-slate-900" />
                                </button>
                                <button
                                  onClick={() => void handleToggleComplete(task)}
                                  className="task-action-icon"
                                  title="Concluir tarefa"
                                >
                                  <Check className="h-4 w-4 text-emerald-600 hover:text-emerald-800" />
                                </button>
                                <button
                                  onClick={() => void handleDeleteTask(task.id)}
                                  className="task-action-icon"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            </div>

                            <h4 className="task-card-title">{task.title}</h4>
                            {task.description && (
                              <p className="task-card-desc">{task.description}</p>
                            )}

                            {isExpanded && task.category === 'system_update' && (
                              <div className="task-card-expanded-details">
                                {task.due_date ? (
                                  <div className="due-date-box">
                                    <div className="due-date-info">
                                      <Calendar className="h-4 w-4 text-slate-500" />
                                      <span>
                                        Prazo:{' '}
                                        {new Date(task.due_date).toLocaleDateString(
                                          'pt-BR',
                                          {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          },
                                        )}
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
                              <span className="task-author">
                                {task.created_by_name || 'usuario'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
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

      <MeetingTopicModal
        isOpen={isMeetingTopicModalOpen}
        onClose={() => {
          setIsMeetingTopicModalOpen(false);
          setTopicToEdit(null);
        }}
        onSaved={() => {
          if (fetchMeetingTopicsFn) {
            fetchMeetingTopicsFn();
          }
        }}
        topicToEdit={topicToEdit}
      />
    </div>
  );
}