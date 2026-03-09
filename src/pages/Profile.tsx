import React, { useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { LogOut, Save, User as UserIcon, Image as ImageIcon, Edit2, Loader2, Trophy, Zap, LayoutGrid, Settings, Plus } from 'lucide-react';

export function Profile() {
  const { profile, setProfile } = useProfileStore();
  const { signOut } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  const fetchBlockedUsers = async () => {
    try {
      setLoadingBlocked(true);
      const { data, error } = await supabase.rpc('get_blocked_users');
      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_blocked_user_id: blockedUserId
      });
      if (error) throw error;
      fetchBlockedUsers();
    } catch (err) {
      console.error('Error unblocking user:', err);
    }
  };

  const toggleBlockedSection = () => {
    if (!showBlocked) {
      fetchBlockedUsers();
    }
    setShowBlocked(!showBlocked);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_user_profile', {
        p_user_id: profile.id,
        p_username: username,
        p_avatar_url: profile.avatar_url,
        p_banner_url: profile.banner_url,
        p_bio: profile.bio
      });

      if (error) throw error;
      
      // Update local state
      setProfile({ ...profile, username });
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-black tracking-tight uppercase">Profile</h1>
        <button 
          onClick={signOut}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Banner */}
        <div className="h-48 bg-blue-400 relative border-b-4 border-black">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          <button className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-100 text-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="-mt-16 relative">
              <div className="w-32 h-32 bg-yellow-300 rounded-2xl border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-3">
                <UserIcon className="w-16 h-16 text-black" />
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-white hover:bg-gray-100 text-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="flex-1 pt-4 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex-1">
                  {editing ? (
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="text-3xl font-black text-black bg-gray-50 border-4 border-black rounded-xl px-4 py-2 w-full max-w-md focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      placeholder="Enter username"
                    />
                  ) : (
                    <h2 className="text-4xl font-black text-black uppercase">{profile.username || 'Duelist'}</h2>
                  )}
                  <p className="text-slate-500 font-bold mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-3">
                  {editing ? (
                    <>
                      <button 
                        onClick={() => {
                          setEditing(false);
                          setUsername(profile.username || '');
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-green-400 hover:bg-green-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                    >
                      <Edit2 className="w-5 h-5" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Level</p>
                  <p className="text-2xl font-black text-black">{profile.level}</p>
                </div>
                <div className="bg-gray-50 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">XP</p>
                  <p className="text-2xl font-black text-black">{profile.xp}</p>
                </div>
                <div className="bg-gray-50 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Gold</p>
                  <p className="text-2xl font-black text-yellow-600">{profile.gold_balance}</p>
                </div>
                <div className="bg-gray-50 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Gems</p>
                  <p className="text-2xl font-black text-emerald-600">{profile.gem_balance}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements / Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-black text-black mb-6 flex items-center gap-2 uppercase">
            <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Achievements
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-yellow-100 border-2 border-black rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-black text-black uppercase">First Blood</h3>
                <p className="text-sm text-slate-600 font-bold">Win your first duel</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-blue-100 border-2 border-black rounded-full flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-black text-black uppercase">Collector</h3>
                <p className="text-sm text-slate-600 font-bold">Collect 100 unique cards</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-black flex items-center gap-2 uppercase">
              <Settings className="w-6 h-6 text-slate-500" />
              Settings
            </h2>
          </div>
          <div className="space-y-4">
            <button 
              onClick={toggleBlockedSection}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors"
            >
              <span className="font-black text-black uppercase">Blocked Users</span>
              <span className="text-sm font-bold text-slate-500">{showBlocked ? 'Hide' : 'Show'}</span>
            </button>

            {showBlocked && (
              <div className="p-4 bg-gray-50 border-2 border-black rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]">
                {loadingBlocked ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <p className="text-center text-slate-500 font-bold py-4">No blocked users</p>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((user) => (
                      <div key={user.blocked_user_id} className="flex items-center justify-between p-3 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="font-bold text-black">{user.blocked_username || 'Unknown User'}</span>
                        <button 
                          onClick={() => handleUnblock(user.blocked_user_id)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-black text-xs uppercase rounded-md border-2 border-red-200 hover:border-red-300 transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
