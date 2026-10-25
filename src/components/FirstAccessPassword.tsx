
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/firstAccess.css';
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';

interface FirstAccessPasswordProps {
  onPasswordChanged: () => void;
}

export default function FirstAccessPassword({
  onPasswordChanged,
}: FirstAccessPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error: passwordError } =
        await supabase.auth.updateUser({ password });

      if (passwordError) throw passwordError;

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: { must_change_password: false },
        });

      if (metadataError) throw metadataError;

      setSuccess('Senha definida com sucesso!');
      await onPasswordChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível alterar a senha.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="first-access-page">
      <section className="first-access-card">
        <div className="first-access-icon">
          <KeyRound size={30} />
        </div>

        <h1>Primeiro acesso</h1>

        <p className="first-access-description">
          Defina sua senha pessoal para acessar o Gerenciador SME.
        </p>

        <form
          onSubmit={handleSubmit}
          className="first-access-form"
        >
          <div className="first-access-field">
            <label htmlFor="new-password">Nova senha</label>

            <div className="first-access-input-wrapper">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="first-access-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? 'Ocultar senha' : 'Mostrar senha'
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <div className="first-access-field">
            <label htmlFor="confirm-password">
              Confirmar nova senha
            </label>

            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Digite a senha novamente"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="first-access-message error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="first-access-message success" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="first-access-button"
            disabled={loading}
          >
            {loading && (
              <Loader2
                size={18}
                className="first-access-spinner"
              />
            )}
            {loading ? 'Salvando...' : 'Definir minha senha'}
          </button>
        </form>

        <p className="first-access-footer">
          Sua senha é pessoal e não deve ser compartilhada.
        </p>
      </section>
    </main>
  );
}
