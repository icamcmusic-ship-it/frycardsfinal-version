import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscordAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(var(--border) 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
      
      <div className="w-full max-w-md bg-[var(--surface)] border-4 border-[var(--border)] p-8 rounded-2xl shadow-[8px_8px_0px_0px_var(--border)] relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-red-500 border-4 border-[var(--border)] rounded-xl flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_var(--border)] transform -rotate-3">
            <span className="text-4xl font-black text-white">F</span>
          </div>
          <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase transform rotate-1">Frycards</h1>
          <p className="text-slate-500 font-bold mt-2">Pop open some fresh packs!</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-100 border-2 border-red-500 rounded-xl text-red-700 font-bold text-sm text-center mb-4"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleDiscordAuth}
          disabled={loading}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-lg py-4 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in with Discord'}
        </button>
      </div>
    </div>
  );
}
