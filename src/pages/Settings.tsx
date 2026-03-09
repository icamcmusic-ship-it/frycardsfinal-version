import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../stores/themeStore';
import { Loader2, Palette, RefreshCw, AlertTriangle } from 'lucide-react';

export function Settings() {
  const { theme, setTheme } = useThemeStore();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your account? This action is permanent.')) return;
    
    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_account');
      if (error) throw error;
      alert('Account reset successfully!');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to reset account');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Settings</h1>
      
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2">
          <Palette className="w-6 h-6" /> Theme
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {(['light', 'dark', 'neon'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-3 font-black rounded-xl border-4 border-black uppercase ${theme === t ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-6 h-6" /> Danger Zone
        </h2>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Reset Account
        </button>
      </div>
    </div>
  );
}
