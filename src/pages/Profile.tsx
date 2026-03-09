import React, { useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Loader2, User as UserIcon, Settings, LogOut, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Profile() {
  const { profile, setProfile } = useProfileStore();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_user_profile', {
        p_username: username,
        p_bio: null,
        p_avatar_url: null,
        p_banner_url: null
      });
      if (error) throw error;
      
      setProfile({ ...profile, username });
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Banner & Avatar */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10">
        <div className="h-48 bg-gradient-to-r from-indigo-900 to-purple-900 relative">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/tcg-banner/1200/400')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>
        
        <div className="px-8 pb-8 relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-slate-800 border-4 border-slate-900 shadow-2xl overflow-hidden relative group">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <UserIcon className="w-16 h-16 text-white/50" />
              </div>
            )}
            <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Edit2 className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button 
                  onClick={() => { setEditing(false); setUsername(profile.username); }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <h1 className="text-3xl font-bold text-white tracking-tight">{profile.username || 'Duelist'}</h1>
                <button 
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-slate-400 mt-1">Level {profile.level} • {profile.xp} XP</p>
          </div>
          
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-white/5">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-400" />
            Account Details
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-slate-400">Member Since</span>
              <span className="text-white font-medium">March 2026</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-slate-400">Total Packs Opened</span>
              <span className="text-white font-medium font-mono">142</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-slate-400">Pity Counter</span>
              <span className="text-white font-medium font-mono">{profile.pity_counter} / 10</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-slate-400">Collection Completion</span>
              <span className="text-white font-medium font-mono">28%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Cosmetics</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Card Back</p>
                <p className="text-sm text-slate-400">Default Holographic</p>
              </div>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors">
                Change
              </button>
            </div>
            
            <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Profile Banner</p>
                <p className="text-sm text-slate-400">Cosmic Nebula</p>
              </div>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors">
                Change
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
