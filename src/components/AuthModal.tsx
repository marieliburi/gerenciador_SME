import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/login.css';
import { Lock, User, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function AuthModal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formattedEmail = username.trim().toLowerCase().includes('@')
      ? username.trim().toLowerCase()
      : `${username.trim().toLowerCase()}@sme.local`;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('ID de usuário ou senha incorretos.');
        } else {
          setErrorMsg(error.message);
        }
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro inesperado ao realizar o login.');
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
            <ShieldCheck className="login-icon" />
          </div>
          <h2 className="login-title">Gerenciador SME</h2>
          <p className="login-subtitle">Informe suas credenciais para continuar</p>
        </div>

        {errorMsg && (
          <div className="login-error">
            <AlertCircle className="login-error-icon" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">ID de Usuário</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="marieliburi ou vagnerc"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <Loader2 className="spinner" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span className="login-footer-text">Acesso Restrito SME</span>
        </div>
      </div>
    </div>
  );
}