'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { friendlySupabaseError } from '@/lib/auth-errors';
import { createBrowserSupabase } from '@/lib/supabase-browser';

type Props = {
  label?: string;
};

export function OAuthGoogleButton({ label = 'Continue with Google' }: Props) {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const onClick = async () => {
    setMessage('');
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const safeNext = next.startsWith('/') ? next : '/dashboard';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (error) {
        setMessage(friendlySupabaseError(error.message));
      }
    } catch (e) {
      setMessage(friendlySupabaseError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-2">
      {message ? <p className="form-error">{message}</p> : null}
      <button
        type="button"
        className="btn self-stretch w-full text-center border border-neutral-600 bg-neutral-100 hover:bg-neutral-200"
        disabled={busy}
        onClick={() => void onClick()}
      >
        {busy ? 'Redirecting…' : label}
      </button>
    </div>
  );
}
