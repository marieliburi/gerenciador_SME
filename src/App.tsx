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
import ProfileView from './components/ProfileView';

import {
  Home,
  LogOut,
  User,
  Loader2,
  Plus,
  CheckCircle2,
  SlidersHorizontal,
  Clock,
  GraduationCap,
  Trash2,
  Check,
  Calendar,
  Pencil,
  MessageSquare,
  StickyNote,
  LayoutGrid,
  ChevronRight,
  X,
} from 'lucide-react';

type NavType = 'home' | 'kanban' | 'meeting_topics' | 'profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Modo de visualização: Kanban vs Notas
  const [viewMode, setViewMode] = useState<'kanban' | 'notes'>('kanban');

  // Modal de Conclusão com Data
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loadingComplete, setLoadingComplete] = useState(false);

  // Navegação Principal com persistência no localStorage
  const [activeNav, setActiveNav] = useState<NavType>(() => {
    const savedNav = localStorage.getItem('sme_active_nav') as NavType;
    return savedNav === ('notes' as any) ? 'kanban' : savedNav || 'home';
  });

  const handleNavigate = (nav: NavType) => {
    setActiveNav(nav);
    localStorage.setItem('sme_active_nav', nav);
  };

  const handleLogout = async () => {
    localStorage.removeItem('sme_active_nav');
    await supabase.auth.signOut();
  };

  const [taskTab, setTaskTab] = useState<'active' | 'completed'>('active');
  const [isMeetingTopicModalOpen, setIsMeetingTopicModalOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<MeetingTopic | null>(null);
  const [fetchMeetingTopicsFn, setFetchMeetingTopicsFn] = useState<(() => void) | null>(null);

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
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
      alert('Não foi possível excluir o item.');
    }
  };

  const handleConfirmCompletion = async () => {
    if (!taskToComplete) return;

    setLoadingComplete(true);
    try {
      const isoDate = new Date(completionDate).toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: isoDate,
        })
        .eq('id', taskToComplete.id);

      if (error) throw error;

      await fetchTasks();
      setTaskToComplete(null);
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err);
      alert('Não foi possível concluir o item.');
    } finally {
      setLoadingComplete(false);
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

  // Mapeamento de cores dos cards por prioridade
  const getCardColorClass = (priority?: string) => {
    if (priority === 'high') return 'red';
    if (priority === 'medium') return 'orange';
    return 'blue';
  };

  // Ordenação por Prioridade (Alta -> Média -> Baixa)
  const priorityOrder: Record<string, number> = {
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortTasksByPriority = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      const pA = priorityOrder[a.priority || 'low'] || 3;
      const pB = priorityOrder[b.priority || 'low'] || 3;
      return pA - pB;
    });
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
  const firstName = currentUserName.charAt(0).toUpperCase() + currentUserName.slice(1);

  const totalTasks = tasks.length;
  
  // Listas filtradas e ordenadas por prioridade
  const demandTasks = sortTasksByPriority(
    tasks.filter((task) => task.category === 'demanda' && task.status !== 'completed')
  );
  const systemTasks = sortTasksByPriority(
    tasks.filter((task) => task.category === 'tarefa' && task.status !== 'completed')
  );
  const completedTasks = sortTasksByPriority(
    tasks.filter((task) => task.status === 'completed')
  );

  return (
    <div className="dashboard-page">
      {/* CABEÇALHO */}
      <header className="w-full">
        <div className="sme-topbar">
          <div className="sme-topbar-left">
            <button onClick={() => handleNavigate('home')} className="sme-icon-btn" title="Ir para a Tela Inicial">
              <Home size={22} />
            </button>

            <button onClick={() => void handleLogout()} className="sme-icon-btn" title="Sair do Sistema">
              <LogOut size={22} />
            </button>
          </div>

          <div className="sme-topbar-right">
            <div
              onClick={() => handleNavigate('profile')}
              className="sme-user-avatar"
              title={`Perfil de ${currentUserName}`}
            >
              <User />
            </div>
          </div>
        </div>

        <div className="sme-welcome-banner">
          <h1 className="sme-welcome-title">
            <span>👋</span>
            <span>Olá, {firstName}</span>
          </h1>
        </div>

        <div className="sme-sub-header flex items-center gap-2">
          <button
            onClick={() => handleNavigate('home')}
            className={`sme-nav-pill ${activeNav === 'home' ? 'active' : ''}`}
          >
            <Home size={14} />
            <span>INÍCIO</span>
          </button>

          {activeNav === 'kanban' && (
            <>
              <ChevronRight size={14} className="text-slate-500" />
              <div className="sme-nav-pill active">
                <LayoutGrid size={14} />
                <span>TAREFAS E DEMANDAS</span>
              </div>
            </>
          )}

          {activeNav === 'meeting_topics' && (
            <>
              <ChevronRight size={14} className="text-slate-500" />
              <div className="sme-nav-pill active">
                <MessageSquare size={14} />
                <span>PAUTAS DE REUNIÃO</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="dash-content">
        {/* TELA INICIAL */}
        {activeNav === 'home' && (
          <div className="home-modules-container">
            <div className="home-modules-grid max-w-2xl mx-auto">
              <div
                onClick={() => handleNavigate('kanban')}
                className="home-module-card group"
              >
                <div className="module-image-wrapper">
                  <img
                    src="/images/kanban.png"
                    alt="Tarefas e Demandas"
                    className="module-image"
                  />
                </div>
                <div className="module-card-footer">
                  <span className="module-title">TAREFAS E DEMANDAS</span>
                </div>
              </div>

              <div
                onClick={() => handleNavigate('meeting_topics')}
                className="home-module-card group"
              >
                <div className="module-image-wrapper">
                  <img
                    src="/images/reuniao.png"
                    alt="Pautas"
                    className="module-image"
                  />
                </div>
                <div className="module-card-footer">
                  <span className="module-title">PAUTAS DE REUNIÃO</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TELA DE PAUTAS */}
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

        {/* TELA DE PERFIL */}
        {activeNav === 'profile' && (
          <ProfileView
            userEmail={session.user.email || ''}
            onAccountDeleted={() => void handleLogout()}
          />
        )}

        {/* TELA DE TAREFAS E DEMANDAS */}
        {activeNav === 'kanban' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="dash-page-title mb-0">Tarefas</h2>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'kanban' ? 'notes' : 'kanban')}
                  className={`btn-view-toggle ${viewMode === 'notes' ? 'active-notes' : ''}`}
                >
                  <StickyNote size={15} />
                  <span>{viewMode === 'notes' ? 'Tarefas' : 'Notas'}</span>
                </button>

                <div className="task-tabs-container">
                  <button
                    onClick={() => setTaskTab('active')}
                    className={`task-tab-btn ${taskTab === 'active' ? 'active' : ''}`}
                  >
                    Em Andamento ({demandTasks.length + systemTasks.length})
                  </button>

                  <button
                    onClick={() => setTaskTab('completed')}
                    className={`task-tab-btn ${taskTab === 'completed' ? 'active' : ''}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 icon-emerald" />
                    <span>Concluídas ({completedTasks.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MODO NOTAS (QUADRO DE CORTIÇA + POST-ITS ORDENADOS) */}
            {viewMode === 'notes' ? (
              <div className="postit-board-wrapper">
                <div className="postit-board-grid">
                  {sortTasksByPriority(
                    tasks.filter((t) =>
                      taskTab === 'active' ? t.status !== 'completed' : t.status === 'completed'
                    )
                  ).map((item, idx) => (
                    <div
                      key={item.id}
                      className={`postit-card postit-rotate-${(idx % 3) + 1}`}
                    >
                      <div className="postit-header">
                        <span className="postit-category-tag">
                          {item.category === 'demanda' ? 'Demanda' : 'Tarefa'}
                        </span>
                        <span className={`priority-pill ${item.priority || 'medium'}`}>
                          {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </div>

                      <p className="postit-body">
                        {item.description || item.title}
                      </p>

                      <div className="postit-footer">
                        <span className="postit-author">{item.created_by_name || 'usuario'}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="postit-action-btn"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          {item.status !== 'completed' && (
                            <button
                              onClick={() => setTaskToComplete(item)}
                              className="postit-action-btn check"
                              title="Concluir"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* MODO KANBAN PADRÃO */
              taskTab === 'active' && (
                <>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div>
                        <div className="metric-card-label">TOTAL DE ITENS</div>
                        <div className="metric-card-value">
                          <span className="number">{totalTasks}</span>
                          <span className="text">cadastrados</span>
                        </div>
                      </div>
                      <div className="metric-icon-box">
                        <SlidersHorizontal className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="metric-card">
                      <div>
                        <div className="metric-card-label">
                          <span className="dot dot-purple" /> DEMANDAS
                        </div>
                        <div className="metric-card-value">
                          <span className="number">{demandTasks.length}</span>
                          <span className="text">mensagens/e-mails</span>
                        </div>
                      </div>
                      <div className="metric-icon-box purple">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="metric-card">
                      <div>
                        <div className="metric-card-label">
                          <span className="dot dot-blue" /> TAREFAS
                        </div>
                        <div className="metric-card-value">
                          <span className="number">{systemTasks.length}</span>
                          <span className="text">alterações de sistema</span>
                        </div>
                      </div>
                      <div className="metric-icon-box blue">
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
                      {/* COLUNA 1: DEMANDAS */}
                      <div className="kanban-column">
                        <div className="column-banner suporte">
                          <div className="column-banner-title">
                            <Clock className="h-5 w-5" />
                            <div>
                              <h3>Demandas</h3>
                            </div>
                          </div>
                          <div className="column-banner-actions">
                            <span className="badge-count">{demandTasks.length}</span>
                            <button onClick={handleOpenCreateModal} className="btn-add-column">
                              <Plus className="h-3.5 w-3.5" />
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </div>

                        <div className="task-list">
                          {demandTasks.length === 0 ? (
                            <div className="empty-task-state">
                              Nenhuma demanda pendente no momento.
                            </div>
                          ) : (
                            demandTasks.map((task) => {
                              const colorClass = getCardColorClass(task.priority);
                              return (
                                <div key={task.id} className={`task-card ${colorClass}`}>
                                  <div className="task-card-header">
                                    <span className="task-tag">Demanda</span>
                                    <div className="task-card-header-actions">
                                      <button
                                        onClick={() => handleOpenEditModal(task)}
                                        className="task-action-icon"
                                        title="Editar"
                                      >
                                        <Pencil className="h-4 w-4 text-slate-600" />
                                      </button>
                                      <button
                                        onClick={() => setTaskToComplete(task)}
                                        className="task-action-icon"
                                        title="Concluir"
                                      >
                                        <Check className="h-4 w-4 text-emerald-600" />
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

                                  <p className="task-card-desc">{task.description || task.title}</p>

                                  <div className="task-card-footer">
                                    <span className={`priority-pill ${task.priority || 'medium'}`}>
                                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
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

                      {/* COLUNA 2: TAREFAS */}
                      <div className="kanban-column">
                        <div className="column-banner siguescola">
                          <div className="column-banner-title">
                            <GraduationCap className="h-5 w-5" />
                            <div>
                              <h3>Tarefas</h3>
                            </div>
                          </div>
                          <div className="column-banner-actions">
                            <span className="badge-count">{systemTasks.length}</span>
                            <button onClick={handleOpenCreateModal} className="btn-add-column">
                              <Plus className="h-3.5 w-3.5" />
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </div>

                        <div className="task-list">
                          {systemTasks.length === 0 ? (
                            <div className="empty-task-state">
                              Nenhuma tarefa pendente no momento.
                            </div>
                          ) : (
                            systemTasks.map((task) => {
                              const colorClass = getCardColorClass(task.priority);
                              return (
                                <div key={task.id} className={`task-card ${colorClass}`}>
                                  <div className="task-card-header">
                                    <span className="task-tag">Tarefa</span>
                                    <div className="task-card-header-actions">
                                      <button
                                        onClick={() => handleOpenEditModal(task)}
                                        className="task-action-icon"
                                        title="Editar"
                                      >
                                        <Pencil className="h-4 w-4 text-slate-600" />
                                      </button>
                                      <button
                                        onClick={() => setTaskToComplete(task)}
                                        className="task-action-icon"
                                        title="Concluir"
                                      >
                                        <Check className="h-4 w-4 text-emerald-600" />
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

                                  <p className="task-card-desc">{task.description || task.title}</p>

                                  {task.due_date && (
                                    <div className="task-card-due-details">
                                      <div className="due-date-box">
                                        <div className="due-date-info">
                                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                          <span>Prazo: {task.due_date.split('T')[0]}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="task-card-footer">
                                    <span className={`priority-pill ${task.priority || 'medium'}`}>
                                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
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
              )
            )}

            {/* SEÇÃO DE CONCLUÍDAS */}
            {taskTab === 'completed' && (
              <div className="kanban-column max-w-2xl mx-auto mt-4">
                <div className="column-banner completed">
                  <div className="column-banner-title">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <h3>Itens Concluídos</h3>
                      <p>Histórico de tarefas e demandas finalizadas</p>
                    </div>
                  </div>
                  <span className="badge-count">{completedTasks.length}</span>
                </div>

                <div className="task-list">
                  {completedTasks.length === 0 ? (
                    <div className="empty-task-state">
                      Nenhum item concluído no momento.
                    </div>
                  ) : (
                    completedTasks.map((task) => (
                      <div key={task.id} className="task-card green opacity-85">
                        <div className="task-card-header">
                          <span className="task-tag">
                            {task.category === 'demanda' ? 'Demanda' : 'Tarefa'}
                          </span>
                          <div className="task-card-header-actions">
                            <button
                              onClick={() => void handleDeleteTask(task.id)}
                              className="task-action-icon"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>

                        <p className="task-card-desc line-through">
                          {task.description || task.title}
                        </p>

                        <div className="task-card-footer">
                          <span className="task-author">
                            Concluído em:{' '}
                            {task.completed_at
                              ? task.completed_at.split('T')[0]
                              : 'Hoje'}
                          </span>
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
          </>
        )}
      </main>

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskCreated={fetchTasks}
        taskToEdit={taskToEdit}
      />

      {/* MODAL DE CONCLUSÃO COM SELEÇÃO DE DATA */}
      {taskToComplete && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h3 className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={20} />
                <span>Concluir Item</span>
              </h3>
              <button
                type="button"
                onClick={() => setTaskToComplete(null)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-form py-2">
              <p className="text-xs text-slate-600 font-medium">
                Confirme a data de conclusão para finalizar este item:
              </p>

              <div className="modal-field">
                <label className="modal-label">Data de Conclusão</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  onClick={() => setTaskToComplete(null)}
                  className="btn-modal-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCompletion}
                  disabled={loadingComplete}
                  className="btn-modal-submit bg-emerald-600 hover:bg-emerald-700"
                >
                  {loadingComplete ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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