import { useState } from 'react';
import * as api from '../api';

interface LoginFormProps {
  onAuthenticated: () => void;
}

export default function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(identifier);
      setMessage(res.message);
      setStep('verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.verify(code);
      onAuthenticated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
            <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.8" />
          </svg>
        </div>
        <h1>eero Dashboard</h1>
        <p className="login-subtitle">Sign in with your eero account</p>

        {error && <div className="error-banner">{error}</div>}

        {step === 'email' ? (
          <form onSubmit={handleLogin}>
            <label htmlFor="identifier">Email or Phone</label>
            <input
              id="identifier"
              type="text"
              placeholder="you@example.com or +1 555-0123"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" disabled={loading || !identifier}>
              {loading ? 'Sending…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            {message && <p className="info-text">{message}</p>}
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              autoComplete="one-time-code"
            />
            <button type="submit" disabled={loading || !code}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="btn-text"
              onClick={() => { setStep('email'); setError(''); setMessage(''); }}
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
