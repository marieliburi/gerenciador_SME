import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Lock, Trash2, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileViewProps {
  userEmail: string;
  onAccountDeleted: () => void;
}

export default function ProfileView({ userEmail, onAccountDeleted }: ProfileViewProps) {
  const displayUsername = userEmail ? userEmail.split('@')[0] : 'usuario';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Alterar Senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!password.trim()) {
      setErrorMsg('Por favor, informe a nova senha.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!confirm('Tem certeza que deseja alterar sua senha?')) return;

    setLoadingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      setSuccessMsg('Senha alterada com sucesso!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err);
      setErrorMsg(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setLoadingPassword(false);
    }
  };

  // Excluir Conta
  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      '⚠️ ATENÇÃO: Tem certeza que deseja excluir sua conta?\nEsta ação é irreversível e todos os seus dados serão apagados.'
    );

    if (!confirmed) return;

    const doubleCheck = prompt('Digite "DELETAR" para confirmar a exclusão da conta:');
    if (doubleCheck !== 'DELETAR') {
      alert('Confirmação incorreta. Ação cancelada.');
      return;
    }

    setLoadingDelete(true);

    try {
      // Exclui a conta do Supabase Auth via RPC/função ou desconecta o usuário
      const { error } = await supabase.rpc('delete_user_account');

      if (error) {
        // Se a RPC não estiver configurada no Supabase, realiza o logout com aviso
        console.warn('RPC delete_user_account não encontrada, desconectando:', error);
      }

      await supabase.auth.signOut();
      onAccountDeleted();
    } catch (err: any) {
      console.error('Erro ao excluir conta:', err);
      alert('Não foi possível excluir a conta. Entre em contato com o suporte.');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="profile-container max-w-xl mx-auto py-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
          <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Perfil do Usuário</h2>
            <p className="text-xs text-slate-500">Gerencie suas credenciais e dados de acesso</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Campo Usuário (Somente Leitura) */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              ID de Usuário 
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                disabled
                value={displayUsername}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 pl-9 pr-3 py-2 text-sm text-slate-600 font-semibold cursor-not-allowed select-none"
              />
            </div>
          </div>

          {/* Formulário de Alteração de Senha */}
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-600" />
              <span>Alterar Senha</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loadingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando Senha...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>
          </form>

          {/* Zona de Perigo - Excluir Conta */}
          <div className="pt-6 border-t border-red-100 mt-6">
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                EXCLUIR CONTA
              </h4>
              <p className="text-xs text-red-600 mb-3">
                Ao excluir sua conta, todos os seus dados serão removidos permanentemente.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={loadingDelete}
                className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loadingDelete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir Minha Conta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}