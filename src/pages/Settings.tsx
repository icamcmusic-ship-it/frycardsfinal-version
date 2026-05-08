import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../stores/themeStore';
import { Loader2, Palette, RefreshCw, AlertTriangle, Volume2, VolumeX, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useProfileStore } from '../stores/profileStore';
import { useAudioStore } from '../stores/audioStore';
import { ConfirmModal } from '../components/ConfirmModal';

export function Settings() {
  const { profile } = useProfileStore();
  const { theme, setTheme } = useThemeStore();
  const { gameStyle, setGameStyle } = useThemeStore();
  const { 
    masterVolume, setMasterVolume,
    musicVolume, setMusicVolume,
    sfxVolume, setSfxVolume,
    audioEnabled, setAudioEnabled,
    musicEnabled, setMusicEnabled,
    sfxEnabled, setSfxEnabled
  } = useAudioStore();

  const [resetting, setResetting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [settings, setSettings] = useState({
    low_perf_mode: false,
    notifications_enabled: true,
    trade_notifications: true,
    auction_notifications: true,
    friend_notifications: true,
    show_online_status: true,
    is_public: true,
  });
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const saveToLocalStorage = (newSettings: any) => {
    localStorage.setItem('frycards_settings', JSON.stringify(newSettings));
  };

  const GAME_STYLES = [
    { id: 'retro',   label: 'Retro',   emoji: '🎮', desc: 'Bold borders, chunky pop art feel' },
    { id: 'neon',    label: 'Neon',    emoji: '⚡', desc: 'Dark base with glowing electric accents' },
    { id: 'minimal', label: 'Minimal', emoji: '🪄', desc: 'Clean, no shadows, quiet UI' },
    { id: 'fantasy', label: 'Fantasy', emoji: '🏰', desc: 'Warm parchment, ornate gold borders' },
    { id: 'dark',    label: 'Dark',    emoji: '🌑', desc: 'Sleek dark with purple tones' },
  ];

  useEffect(() => {
    fetchSettings();
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const { data, error } = await supabase.rpc('get_blocked_users');
      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('unblock_user', { p_blocked_user_id: userId });
      if (error) throw error;
      toast.success('User unblocked');
      fetchBlockedUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unblock user');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data: prof } = await supabase.rpc('get_my_profile');
      const saved = localStorage.getItem('frycards_settings');
      const localData = saved ? JSON.parse(saved) : {};
      const remotePrefs = prof?.notification_prefs || {};

      setSettings({
        low_perf_mode: localData.low_perf_mode ?? false,
        notifications_enabled: remotePrefs.enabled ?? localData.notifications_enabled ?? true,
        trade_notifications: remotePrefs.trades ?? localData.trade_notifications ?? true,
        auction_notifications: remotePrefs.marketplace ?? localData.auction_notifications ?? true,
        friend_notifications: remotePrefs.friends ?? localData.friend_notifications ?? true,
        show_online_status: prof?.show_online_status ?? localData.show_online_status ?? true,
        is_public: prof?.is_public ?? localData.is_public ?? true,
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (key === 'master_volume') setMasterVolume(value);
    else if (key === 'music_volume') setMusicVolume(value);
    else if (key === 'sfx_volume') setSfxVolume(value);
    else if (key === 'audio_enabled') setAudioEnabled(value);
    else if (key === 'music_enabled') setMusicEnabled(value);
    else if (key === 'sfx_enabled') setSfxEnabled(value);
    else if (key === 'game_style') setGameStyle(value);
    else {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      saveToLocalStorage(newSettings);
    }

    const isPrivacySetting = key === 'is_public' || key === 'show_online_status';
    const isNotificationSetting = key === 'notifications_enabled' || key.includes('_notifications');

    if (isPrivacySetting || isNotificationSetting) {
      try {
        const updatedSettings = isNotificationSetting ? { ...settings, [key]: value } : settings;
        
        const { error } = await supabase
          .from('profiles')
          .update({
            is_public: key === 'is_public' ? value : settings.is_public,
            show_online_status: key === 'show_online_status' ? value : settings.show_online_status,
            notification_prefs: {
              enabled: updatedSettings.notifications_enabled,
              trades: updatedSettings.trade_notifications,
              marketplace: updatedSettings.auction_notifications,
              friends: updatedSettings.friend_notifications
            }
          })
          .eq('id', profile?.id);

        if (error) throw error;
      } catch (err: any) {
        console.error(`Error updating ${key}:`, err);
      }
    }
  };

  const handleReset = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reset Account',
      message: 'Are you sure you want to reset your account? This action is permanent.',
      variant: 'danger',
      onConfirm: async () => {
        const input = prompt(`TYPE YOUR USERNAME "${profile?.username}" TO CONFIRM RESET:`);
        if (input !== profile?.username) {
          toast.error('Incorrect username. Reset cancelled.');
          return;
        }
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
      }
    });
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
                onClick={() => updateSetting('audio_enabled', !audioEnabled)}
                className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${audioEnabled ? 'bg-green-400' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${audioEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold text-[var(--text)]">
                <span className="flex items-center gap-2">Master Volume</span>
                <span>{masterVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={masterVolume}
                onChange={(e) => updateSetting('master_volume', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold text-[var(--text)]">
                <span className="flex items-center gap-2">
                  Music Volume
                  <button 
                    onClick={() => { import('../services/AudioService').then(s => s.audioService.play('divine_reveal')); }}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200"
                    title="Test Music Channel"
                  >
                    <Volume2 className="w-3 h-3 text-purple-600" />
                  </button>
                </span>
                <span>{musicVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={musicVolume}
                onChange={(e) => updateSetting('music_volume', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold text-[var(--text)]">
                <span className="flex items-center gap-2">
                  SFX Volume
                  <button 
                    onClick={() => { import('../services/AudioService').then(s => s.audioService.play('rare_reveal')); }}
                    className="p-1 hover:bg-slate-100 rounded border border-slate-200"
                    title="Test SFX Channel"
                  >
                    <Volume2 className="w-3 h-3 text-emerald-600" />
                  </button>
                </span>
                <span>{sfxVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={sfxVolume}
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
            { key: 'low_perf_mode', label: 'Low Performance Mode', value: settings.low_perf_mode },
            { key: 'notifications_enabled', label: 'Enable Notifications', value: settings.notifications_enabled },
            { key: 'trade_notifications', label: 'Trade Notifications', value: settings.trade_notifications },
            { key: 'auction_notifications', label: 'Auction Notifications', value: settings.auction_notifications },
            { key: 'friend_notifications', label: 'Friend Notifications', value: settings.friend_notifications },
            { key: 'show_online_status', label: 'Show Online Status', value: settings.show_online_status },
            { key: 'is_public', label: 'Public Profile', value: settings.is_public },
          ].map(({ key, label, value }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="font-bold text-[var(--text)]">{label}</span>
              <button 
                onClick={() => updateSetting(key, !value)}
                className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${value ? 'bg-green-400' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}

          <div className="pt-4 border-t-2 border-[var(--border)]">
            {/* Removed duplicate Game Style section */}
          </div>
        </div>
      </div>

      {/* Blocked Users */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-[var(--text)]">
          <AlertTriangle className="w-6 h-6" /> Blocked Users
        </h2>
        <div className="space-y-3">
          {loadingBlocked ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm font-bold text-slate-500 italic">No blocked users.</p>
          ) : (
            blockedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl">
                <span className="font-black text-[var(--text)]">{user.username}</span>
                <button 
                  onClick={() => unblockUser(user.id)}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-black text-xs uppercase rounded-lg border-2 border-red-200 transition-colors"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>

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
          Reset Account
        </button>
      </div>
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />
    </div>
  );
}
