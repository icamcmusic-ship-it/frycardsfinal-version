import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../stores/themeStore';
import { Loader2, Palette, RefreshCw, AlertTriangle, Volume2, VolumeX, Music } from 'lucide-react';
import toast from 'react-hot-toast';

export function Settings() {
  const { theme, setTheme } = useThemeStore();
  const [resetting, setResetting] = useState(false);
  const [settings, setSettings] = useState({
    master_volume: 80,
    music_volume: 50,
    sfx_volume: 70,
    audio_enabled: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      const { error } = await supabase.rpc('upsert_user_settings', { p_settings: newSettings });
      if (error) throw error;
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your account? This action is permanent.')) return;
    
    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_account');
      if (error) throw error;
      toast.success('Account reset successfully!');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset account');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Settings</h1>
      
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-[var(--text)]">
          <Palette className="w-6 h-6" /> Theme
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {(['light', 'dark', 'neon'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-3 font-black rounded-xl border-4 border-[var(--border)] uppercase ${theme === t ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Settings */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-[var(--text)]">
          <Volume2 className="w-6 h-6" /> Audio
        </h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--text)]">Enable Audio</span>
            <button 
              onClick={() => updateSetting('audio_enabled', !settings.audio_enabled)}
              className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${settings.audio_enabled ? 'bg-green-400' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.audio_enabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-[var(--text)]">
              <span>Master Volume</span>
              <span>{settings.master_volume}%</span>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={settings.master_volume}
              onChange={(e) => updateSetting('master_volume', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-[var(--text)]">
              <span>Music Volume</span>
              <span>{settings.music_volume}%</span>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={settings.music_volume}
              onChange={(e) => updateSetting('music_volume', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-[var(--text)]">
              <span>SFX Volume</span>
              <span>{settings.sfx_volume}%</span>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={settings.sfx_volume}
              onChange={(e) => updateSetting('sfx_volume', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-6 h-6" /> Danger Zone
        </h2>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Reset Account
        </button>
      </div>
    </div>
  );
}
