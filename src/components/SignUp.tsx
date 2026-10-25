import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // Ajuste o caminho conforme a estrutura do seu projeto
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SignUpProps {
  onNavigateToLogin: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigateToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações básicas de formulário
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Criação da conta no Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // Salva o nome nos metadados do usuário
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-slate-100">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <UserPlus size={24} />
          </div>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900">
            Criar nova conta
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Preencha os dados abaixo para começar
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center text-green-600">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Conta criada com sucesso!</h3>
            <p className="text-sm text-slate-600">
              Verifique seu e-mail para confirmar seu cadastro antes de fazer login.
            </p>
            <button
              onClick={onNavigateToLogin}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ir para o Login
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Criando conta...' : 'Cadastrar'}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-slate-600">Já tem uma conta? </span>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-medium text-blue-600 hover:text-blue-500 underline"
              >
                Fazer login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};