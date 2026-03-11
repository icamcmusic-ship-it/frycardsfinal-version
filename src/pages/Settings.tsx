import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../stores/themeStore';
import { Loader2, Palette, RefreshCw, AlertTriangle, Volume2, VolumeX, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useProfileStore } from '../stores/profileStore';

export function Settings() {
  const { profile } = useProfileStore();
  const { theme, setTheme } = useThemeStore();
  const { gameStyle, setGameStyle } = useThemeStore();
  const [resetting, setResetting] = useState(false);
  const [settings, setSettings] = useState({
    master_volume: 80,
    music_volume: 60,
    sfx_volume: 70,
    audio_enabled: true,
    sfx_enabled: true,
    music_enabled: true,
    low_perf_mode: false,
    notifications_enabled: true,
    trade_notifications: true,
    auction_notifications: true,
    friend_notifications: true,
    show_online_status: true,
    game_style: 'retro',
  });

  const GAME_STYLES = [
    { id: 'retro',   label: 'Retro',   emoji: '🎮', desc: 'Bold borders, chunky pop art feel' },
    { id: 'neon',    label: 'Neon',    emoji: '⚡', desc: 'Dark base with glowing electric accents' },
    { id: 'minimal', label: 'Minimal', emoji: '🪄', desc: 'Clean, no shadows, quiet UI' },
    { id: 'fantasy', label: 'Fantasy', emoji: '🏰', desc: 'Warm parchment, ornate gold borders' },
    { id: 'dark',    label: 'Dark',    emoji: '🌑', desc: 'Sleek dark with purple tones' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      if (data) {
        setSettings(data);
        if (data.game_style) setGameStyle(data.game_style as any);
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

  const themes = [
    { id: 'light',      label: '☀️ Light',      preview: '#fff7ed' },
    { id: 'dark',       label: '🌙 Dark',       preview: '#18181b' },
    { id: 'neon',       label: '⚡ Neon',       preview: '#0d0d0d' },
    { id: 'ocean',      label: '🌊 Ocean',      preview: '#0a1628' },
    { id: 'sunset',     label: '🌅 Sunset',     preview: '#1a0a00' },
    { id: 'forest',     label: '🌲 Forest',     preview: '#0a1a0a' },
    { id: 'monochrome', label: '⬛ Mono',       preview: '#111111' },
    { id: 'candy',      label: '🍭 Candy',      preview: '#fff0fb' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Settings</h1>
      
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-[var(--text)]">
          <Palette className="w-6 h-6" /> Theme
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`px-4 py-3 font-black rounded-xl border-4 border-[var(--border)] uppercase flex flex-col items-center gap-2 ${theme === t.id ? 'bg-black text-white' : 'bg-[var(--bg)] text-[var(--text)]'}`}
            >
              <div className="w-6 h-6 rounded-full border-2 border-[var(--border)]" style={{ backgroundColor: t.preview }} />
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
        <h2 className="text-xl font-black uppercase text-[var(--text)] mb-4">🎨 Game Style</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GAME_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => {
                setGameStyle(style.id as any);
                updateSetting('game_style', style.id);
              }}
              className={cn(
                "p-4 rounded-xl border-4 text-left transition-all",
                gameStyle === style.id
                  ? "border-blue-500 bg-blue-50 shadow-[4px_4px_0px_0px_#3b82f6]"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-blue-300"
              )}
            >
              <p className="text-2xl mb-1">{style.emoji}</p>
              <p className="font-black text-[var(--text)]">{style.label}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">{style.desc}</p>
              {gameStyle === style.id && <p className="text-xs font-black text-blue-500 mt-2">✓ Active</p>}
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

      {/* General Settings */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-[var(--text)]">
          <Palette className="w-6 h-6" /> General
        </h2>
        <div className="space-y-4">
          {[
            { key: 'sfx_enabled', label: 'SFX Enabled' },
            { key: 'music_enabled', label: 'Music Enabled' },
            { key: 'low_perf_mode', label: 'Low Performance Mode' },
            { key: 'notifications_enabled', label: 'Enable Notifications' },
            { key: 'trade_notifications', label: 'Trade Notifications' },
            { key: 'auction_notifications', label: 'Auction Notifications' },
            { key: 'friend_notifications', label: 'Friend Notifications' },
            { key: 'show_online_status', label: 'Show Online Status' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="font-bold text-[var(--text)]">{label}</span>
              <button 
                onClick={() => updateSetting(key, !(settings as any)[key])}
                className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${(settings as any)[key] ? 'bg-green-400' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${(settings as any)[key] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}

          <div className="pt-4 border-t-2 border-[var(--border)]">
            {/* Removed duplicate Game Style section */}
          </div>
        </div>
      </div>

      {profile?.is_admin && (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
          <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-6 h-6" /> Danger Zone
          </h2>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_var(--border)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Reset Account (Admin)
          </button>
        </div>
      )}
    </div>
  );
}
