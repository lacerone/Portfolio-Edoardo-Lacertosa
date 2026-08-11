'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      setMessage(`Errore: ${error.message}`);
    } else {
      setMessage('? Controlla la tua email! Ti abbiamo inviato il link di accesso.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 p-8 rounded-xl shadow-2xl backdrop-blur-md">
        <h1 className="text-2xl font-serif font-bold tracking-tight mb-2">Admin Access</h1>
        <p className="text-sm text-neutral-400 mb-6 font-mono">
          Inserisci la tua mail per ricevere il Magic Link di accesso al portfolio.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
              Email Amministratore
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="latua@email.com"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500 text-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-100 text-neutral-950 font-medium py-3 rounded-lg text-sm hover:bg-neutral-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Invio in corso...' : 'Invia Magic Link'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-xs font-mono text-center text-neutral-300 bg-neutral-950/50 p-3 rounded border border-neutral-800">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
