'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn nav-signout" disabled={busy} onClick={() => void signOut()}>
      {busy ? '…' : 'Sign out'}
    </button>
  );
}
