import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/login.css';
import {
  Lock,
  User,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AuthModal() {
  const [isSignUp, setIsSignUp] = useState(false);

  // Campos do formulário
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados para alternar a visualização da senha
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setErrorMsg('Por favor, informe o ID de usuário.');
      setLoading(false);
      return;
    }

    const formattedEmail = cleanUsername.includes('@')
      ? cleanUsername
      : `${cleanUsername}@sme.local`;

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setErrorMsg('As senhas não coincidem.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formattedEmail,
          password: password.trim(),
          options: {
            data: {
              display_name: cleanUsername,
              username: cleanUsername,
              must_change_password: false,
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            setErrorMsg('Este ID de usuário já está cadastrado.');
          } else if (error.message.includes('rate limit')) {
            setErrorMsg('Limite de requisições excedido. Aguarde alguns instantes.');
          } else {
            setErrorMsg(error.message);
          }
          return;
        }

        if (data.session) {
          setSuccessMsg('Conta criada com sucesso! Entrando no sistema...');
        } else {
          setSuccessMsg('Conta criada com sucesso! Você já pode fazer login.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: password.trim(),
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('ID de usuário ou senha incorretos.');
          } else {
            setErrorMsg(error.message);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg('Ocorreu um erro inesperado ao processar a solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glow-blue" />
      <div className="login-glow-yellow" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-box">
            {isSignUp ? (
              <UserPlus className="login-icon" />
            ) : (
              <ShieldCheck className="login-icon" />
            )}
          </div>
          <h2 className="login-title">Gerenciador SME</h2>
          <p className="login-subtitle">
            {isSignUp
              ? 'Informe seu ID de usuário e defina uma senha'
              : 'Informe suas credenciais para continuar'}
          </p>
        </div>

        {errorMsg && (
          <div className="login-error">
            <AlertCircle className="login-error-icon" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="login-success">
            <CheckCircle2 className="login-success-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">ID de Usuário *</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário:"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha *</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-btn"
                title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
              >
                {showPassword ? (
                  <EyeOff className="toggle-password-icon" />
                ) : (
                  <Eye className="toggle-password-icon" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Confirmar Senha *</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="toggle-password-btn"
                  title={showConfirmPassword ? 'Ocultar senha' : 'Visualizar senha'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="toggle-password-icon" />
                  ) : (
                    <Eye className="toggle-password-icon" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <Loader2 className="spinner" />
                <span>{isSignUp ? 'Criando conta...' : 'Autenticando...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Cadastrar Conta' : 'Entrar no Sistema'}</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span className="login-footer-text">
            {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
          </span>
          <button type="button" onClick={toggleMode} className="login-toggle-btn">
            {isSignUp ? 'Voltar para o Login' : 'Criar uma conta'}
          </button>
        </div>
      </div>
    </div>
  );
}