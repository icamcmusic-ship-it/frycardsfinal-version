import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { LogOut, Save, User as UserIcon, Image as ImageIcon, Edit2, Loader2, Trophy, Zap, LayoutGrid, Settings as SettingsIcon, Plus } from 'lucide-react';
import { cn, getAvatarUrl, getBannerUrl, getCardBackUrl } from '../lib/utils';
import toast from 'react-hot-toast';

export function Profile() {
  const { profile, setProfile } = useProfileStore();
  const { user, signOut } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || '');
  const [ownedBanners, setOwnedBanners] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);

  const discordAvatar = user?.user_metadata?.avatar_url;

  useEffect(() => {
    fetchAchievements();
    supabase.rpc('get_user_cosmetics').then(({ data }) => {
      setOwnedBanners((data || []).filter((c: any) => c.item_type === 'profile_banner' || c.item_type === 'profile_avatar'));
    });
  }, []);

  const fetchAchievements = async () => {
    await supabase.rpc('check_and_unlock_achievements', { p_user_id: profile?.id });
    const { data } = await supabase.rpc('get_user_achievements');
    setAchievements(data || []);
  };

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
      const { error } = await supabase.rpc('update_user_profile', {
        p_user_id: profile.id,
        p_username: username,
        p_avatar_url: avatarUrl,
        p_banner_url: bannerUrl,
        p_bio: profile.bio
      });

      if (error) throw error;
      
      // Update local state
      setProfile({ ...profile, username, avatar_url: avatarUrl, banner_url: bannerUrl });
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/profile/${profile?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Profile link copied to clipboard!', { icon: '🔗' });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Profile</h1>
        <button 
          onClick={signOut}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
        {/* Banner */}
        <div className="h-48 bg-blue-400 relative border-b-4 border-[var(--border)]">
          <img src={getBannerUrl(bannerUrl || profile.banner_url) || ''} alt="Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="-mt-16 relative">
              <div className="w-32 h-32 bg-yellow-300 rounded-2xl border-4 border-[var(--border)] flex items-center justify-center shadow-[4px_4px_0px_0px_var(--border)] transform -rotate-3 overflow-hidden">
                {getAvatarUrl(avatarUrl || profile.avatar_url) || discordAvatar ? (
                  <img src={getAvatarUrl(avatarUrl || profile.avatar_url) || discordAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-16 h-16 text-black" />
                )}
              </div>
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
                      className="text-3xl font-black text-[var(--text)] bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl px-4 py-2 w-full max-w-md focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_var(--border)]"
                      placeholder="Enter username"
                    />
                  ) : (
                    <h2 className="text-4xl font-black text-[var(--text)] uppercase">{profile.username || 'Duelist'}</h2>
                  )}
                  <p className="text-slate-500 font-bold mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[var(--bg)] hover:bg-slate-50 text-[var(--text)] font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                    Copy Link
                  </button>
                  {editing ? (
                    <>
                      <button 
                        onClick={() => {
                          setEditing(false);
                          setUsername(profile.username || '');
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)]"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-green-400 hover:bg-green-500 text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
                    >
                      <Edit2 className="w-5 h-5" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {editing && (
                <div className="mb-6 space-y-6">
                  <div>
                    <p className="font-black mb-2 text-[var(--text)]">Select Avatar:</p>
                    <div className="flex gap-3 flex-wrap">
                      {ownedBanners.filter(b => b.item_type === 'profile_avatar').length === 0
                        ? <p className="text-sm text-slate-500 font-bold">No avatars owned. Visit the Shop!</p>
                        : ownedBanners.filter(b => b.item_type === 'profile_avatar').map(b => (
                            <button key={b.item_id}
                              onClick={() => setAvatarUrl(b.image_url)}
                              className={cn("w-16 h-16 rounded-xl border-4 overflow-hidden",
                                avatarUrl === b.image_url ? "border-blue-500" : "border-[var(--border)]")}>
                              <img src={b.image_url} className="w-full h-full object-cover" />
                            </button>
                          ))
                      }
                    </div>
                  </div>
                  <div>
                    <p className="font-black mb-2 text-[var(--text)]">Select Banner:</p>
                    <div className="flex gap-3 flex-wrap">
                      {ownedBanners.filter(b => b.item_type === 'profile_banner').length === 0
                        ? <p className="text-sm text-slate-500 font-bold">No banners owned. Visit the Shop!</p>
                        : ownedBanners.filter(b => b.item_type === 'profile_banner').map(b => (
                            <button key={b.item_id}
                              onClick={() => setBannerUrl(b.image_url)}
                              className={cn("w-24 h-14 rounded-lg border-4 overflow-hidden",
                                bannerUrl === b.image_url ? "border-blue-500" : "border-[var(--border)]")}>
                              <img src={b.image_url} className="w-full h-full object-cover" />
                            </button>
                          ))
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Level</p>
                  <p className="text-2xl font-black text-[var(--text)]">{profile.level}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">XP</p>
                  <p className="text-2xl font-black text-[var(--text)]">{profile.xp}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Gold</p>
                  <p className="text-2xl font-black text-yellow-600">{profile.gold_balance}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Gems</p>
                  <p className="text-2xl font-black text-emerald-600">{profile.gem_balance}</p>
                </div>
              </div>

              {/* Card Back Preview */}
              <div className="mt-6">
                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Equipped Card Back</p>
                <div className="w-24 aspect-[3/4] rounded-xl border-4 border-[var(--border)] bg-gray-200 overflow-hidden shadow-[4px_4px_0px_0px_var(--border)]">
                  <img 
                    src={getCardBackUrl(profile.card_back_url)} 
                    alt="Card Back" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements / Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
          <h2 className="text-2xl font-black text-[var(--text)] mb-6 flex items-center gap-2 uppercase">
            <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Achievements
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {achievements.map(ach => (
              <div 
                key={ach.id} 
                className={cn(
                  "flex items-center gap-4 p-4 border-2 rounded-xl shadow-[2px_2px_0px_0px_var(--border)] transition-all",
                  ach.unlocked_at 
                    ? "bg-yellow-50/50 border-yellow-400" 
                    : "bg-[var(--bg)] border-[var(--border)] opacity-60 grayscale"
                )}
              >
                <div className={cn(
                  "w-12 h-12 border-2 border-[var(--border)] rounded-full flex items-center justify-center shrink-0",
                  ach.unlocked_at ? "bg-yellow-400" : "bg-slate-200"
                )}>
                  <Trophy className={cn("w-6 h-6", ach.unlocked_at ? "text-white" : "text-slate-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[var(--text)] uppercase truncate">{ach.name}</h3>
                  <p className="text-sm text-slate-600 font-bold line-clamp-1">{ach.description}</p>
                  {ach.unlocked_at && (
                    <p className="text-[10px] font-black text-yellow-600 uppercase mt-1">
                      Unlocked {new Date(ach.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {achievements.length === 0 && (
              <p className="text-center text-slate-500 font-bold py-8">No achievements yet. Keep playing!</p>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 uppercase">
              <SettingsIcon className="w-6 h-6 text-slate-500" />
              Settings
            </h2>
          </div>
          <div className="space-y-4">
            <button 
              onClick={toggleBlockedSection}
              className="w-full flex items-center justify-between p-4 bg-[var(--bg)] hover:bg-slate-50 border-2 border-[var(--border)] rounded-xl shadow-[2px_2px_0px_0px_var(--border)] transition-colors"
            >
              <span className="font-black text-[var(--text)] uppercase">Blocked Users</span>
              <span className="text-sm font-bold text-slate-500">{showBlocked ? 'Hide' : 'Show'}</span>
            </button>

            {showBlocked && (
              <div className="p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]">
                {loadingBlocked ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <p className="text-center text-slate-500 font-bold py-4">No blocked users</p>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((user) => (
                      <div key={user.blocked_user_id} className="flex items-center justify-between p-3 bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg shadow-[2px_2px_0px_0px_var(--border)]">
                        <span className="font-bold text-[var(--text)]">{user.blocked_username || 'Unknown User'}</span>
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
