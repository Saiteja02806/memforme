'use client';

import Link from 'next/link';
import { useState } from 'react';
import { friendlySupabaseError } from '@/lib/auth-errors';
import { OAuthGoogleButton } from '@/components/OAuthGoogleButton';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        setError(friendlySupabaseError(error.message));
        return;
      }
      if (data.session) {
        window.location.assign('/dashboard');
        return;
      }
      if (data.user) {
        setInfo(
          `Account created for ${data.user.email ?? 'your email'}. If this project requires email confirmation, open the link Supabase sent you, then sign in. Otherwise try signing in now.`
        );
        return;
      }
      setInfo(
        'Sign-up completed. Check your email for a confirmation link, or try signing in if confirmation is disabled in Supabase.'
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(friendlySupabaseError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={(e) => void onSubmit(e)}>
      {error ? <p className="form-error">{error}</p> : null}
      {info ? <p className="form-info">{info}</p> : null}
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? 'Creating account…' : 'Sign up'}
      </button>

      <p className="text-center text-sm text-neutral-500 my-1">or</p>
      <OAuthGoogleButton label="Sign up with Google" />

      <p className="muted small">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
