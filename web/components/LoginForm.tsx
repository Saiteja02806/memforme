'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { friendlySupabaseError } from '@/lib/auth-errors';
import { OAuthGoogleButton } from '@/components/OAuthGoogleButton';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const err = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(err === 'oauth' ? 'Sign-in failed. Try again.' : '');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(friendlySupabaseError(error.message));
        return;
      }
      const dest = next.startsWith('/') ? next : '/dashboard';
      window.location.assign(dest);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage(friendlySupabaseError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={(e) => void onSubmit(e)}>
      {message ? <p className="form-error">{message}</p> : null}
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-neutral-500 my-1">or</p>
      <OAuthGoogleButton label="Continue with Google" />

      <p className="muted small">
        No account? <Link href="/signup">Create one</Link>
      </p>
    </form>
  );
}
