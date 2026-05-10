import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { LogOut, Save, User as UserIcon, Image as ImageIcon, Edit2, Loader2, Trophy, Zap, LayoutGrid, Settings as SettingsIcon, Plus, ExternalLink, ShoppingBag, Shirt, Sparkles, Star } from 'lucide-react';
import { cn, getAvatarUrl, getBannerUrl, getCardBackUrl } from '../lib/utils';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import RecentPulls from '../components/RecentPulls';
import { calculateLevelProgress } from '../lib/xp';

export function Profile() {
  const navigate = useNavigate();
  const { profile, setProfile, collectionStats: ownStats } = useProfileStore();
  
  const levelInfo = useMemo(() => profile ? calculateLevelProgress(profile.xp) : null, [profile?.xp]);
  const { user, signOut: authSignOut } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [ownedBanners, setOwnedBanners] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [ratings, setRatings] = useState<{ rating: number; wins: number; losses: number; draws: number } | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(false);

  const discordAvatar = user?.user_metadata?.avatar_url;

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setBannerUrl(profile.banner_url || '');
      setBio(profile.bio || '');
      fetchRatings();
    }
  }, [profile]);

  const fetchRatings = async () => {
    if (!profile?.id) return;
    setLoadingRatings(true);
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select('rating, wins, losses, draws')
        .eq('user_id', profile.id)
        .maybeSingle(); // Use maybeSingle to avoid 406 if no rating yet
      
      if (!error && data) {
        setRatings(data);
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
    } finally {
      setLoadingRatings(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
    supabase.rpc('get_user_cosmetics').then(({ data }) => {
      setOwnedBanners((data || []).filter((c: any) => c.item_type === 'profile_banner' || c.item_type === 'profile_avatar'));
    });
  }, []);

  const fetchAchievements = async () => {
    if (!profile?.id) return;
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

  const [userCosmetics, setUserCosmetics] = useState<any[]>([]);
  const [loadingCosmetics, setLoadingCosmetics] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'primary' | 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const fetchUserCosmetics = async () => {
    if (!user) return;
    try {
      setLoadingCosmetics(true);
      const { data, error } = await supabase.rpc('get_user_cosmetics');
      if (!error) {
        setUserCosmetics(data || []);
      }
    } catch (err) {
      console.error('Error fetching cosmetics:', err);
    } finally {
      setLoadingCosmetics(false);
    }
  };

  const handleEquip = async (userItemId: string) => {
    try {
      const { data, error } = await supabase.rpc('equip_item', { p_user_item_id: userItemId });
      if (error || data?.success === false) {
        toast.error(error?.message || data?.error || 'Failed to equip');
        return;
      }
      toast.success('Equipped!', { icon: '✨' });
      fetchUserCosmetics();
      useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to equip item');
    }
  };

  const handleUnequip = async (itemType: string) => {
    try {
      const { error } = await supabase.rpc('unequip_cosmetic_type', { p_item_type: itemType });
      if (error) throw error;
      fetchUserCosmetics();
      useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unequip item');
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserCosmetics();
    }
  }, [user]);

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
        p_username: username,
        p_avatar_url: avatarUrl,
        p_banner_url: bannerUrl,
        p_bio: bio
      });

      if (error) throw error;
      
      // Update local state
      setProfile({ ...profile, username, avatar_url: avatarUrl, banner_url: bannerUrl, bio });
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
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-10 bg-slate-200 rounded-xl w-32 border-4 border-[var(--border)]"></div>
          <div className="h-10 bg-slate-200 rounded-xl w-32 border-4 border-[var(--border)]"></div>
        </div>
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="h-48 bg-slate-200 border-b-4 border-[var(--border)]"></div>
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="-mt-16 w-32 h-32 bg-slate-200 rounded-2xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)]"></div>
              <div className="flex-1 pt-4 w-full space-y-4">
                <div className="h-10 bg-slate-200 rounded-xl w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-16 bg-slate-200 rounded-xl border-2 border-[var(--border)]"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Profile</h1>
        <button 
          onClick={authSignOut}
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
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-[var(--text)] uppercase">{profile.username || 'Duelist'}</h2>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-blue-100 px-3 py-1 rounded-full border-2 border-blue-200">
                          <Trophy className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-black text-blue-700 uppercase">Level {levelInfo?.level || 1}</span>
                        </div>
                        <div className="flex-1 max-w-xs">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                            <span>XP Progress</span>
                            <span>{levelInfo?.currentXp || 0} / {levelInfo?.nextLevelXp || 1000}</span>
                          </div>
                          <div className="h-3 bg-slate-200 rounded-full border-2 border-slate-300 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${levelInfo?.progressPct || 0}%` }}
                              className="h-full bg-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {ownStats && (
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-full border-2 border-emerald-200">
                             <LayoutGrid className="w-4 h-4 text-emerald-600" />
                             <span className="text-sm font-black text-emerald-700 uppercase">Collection</span>
                          </div>
                          <div className="flex-1 max-w-xs">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                              <span>Completion</span>
                              <span>{Math.round(ownStats.completion_pct || 0)}%</span>
                            </div>
                            <div className="h-3 bg-slate-200 rounded-full border-2 border-slate-300 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${ownStats.completion_pct || 0}%` }}
                                className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                transition={{ duration: 1.5, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-slate-500 font-bold mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                  {!editing && profile.bio && (
                    <p className="text-slate-600 font-medium mt-2 max-w-md">{profile.bio}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => navigate('/decks')}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
                  >
                    <LayoutGrid className="w-5 h-5" />
                    My Decks
                  </button>
                  <button 
                    onClick={() => window.open(`/profile/${profile?.id}`, '_blank')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    View Public Profile
                  </button>
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
                    <p className="font-black mb-2 text-[var(--text)]">Bio:</p>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="text-lg font-bold text-[var(--text)] bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_var(--border)] resize-none h-24"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Ranked Stats */}
              <div className="mt-6">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">Ranked Profile</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-400 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(251,191,36,0.3)] group relative">
                    <p className="text-[10px] text-amber-700 font-black uppercase mb-1 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> ELO Rating
                    </p>
                    <p className="text-2xl font-black text-amber-900">{ratings?.rating ?? 1000}</p>
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-white/20">
                      Calculated using the v2 Elo algorithm based on PvP performance.
                    </div>
                  </div>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(59,130,246,0.1)]">
                    <p className="text-[10px] text-blue-600 font-black uppercase mb-1">Total Wins</p>
                    <p className="text-2xl font-black text-blue-800">{ratings?.wins ?? 0}</p>
                  </div>
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.1)]">
                    <p className="text-[10px] text-red-600 font-black uppercase mb-1">Losses</p>
                    <p className="text-2xl font-black text-red-800">{ratings?.losses ?? 0}</p>
                  </div>
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                    <p className="text-[10px] text-slate-600 font-black uppercase mb-1">Win Rate</p>
                    <p className="text-2xl font-black text-slate-800">
                      {ratings ? (ratings.wins + ratings.losses === 0 ? '0%' : `${Math.round((ratings.wins / (ratings.wins + ratings.losses)) * 100)}%`) : '0%'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Showcase Stats */}
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Unique Cards</p>
                  <p className="text-2xl font-black text-blue-600">{ownStats?.unique_cards || 0}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Cards</p>
                  <p className="text-2xl font-black text-purple-600">{ownStats?.total_cards || 0}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)] group relative cursor-help">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">SR+ Pity <Star className="w-3 h-3 text-purple-600" /></p>
                  <p className="text-2xl font-black text-purple-600">{profile.pity_counter}/50</p>
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-white/20">
                    Guaranteed Super-Rare or better at 50 packs. Progress shared across all standard packs.
                  </div>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0_0_var(--border)] group relative cursor-help">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">Mythic Pity <Zap className="w-3 h-3 text-orange-600" /></p>
                  <p className="text-2xl font-black text-orange-600">{profile.soft_pity_counter}/100</p>
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-white/20">
                    Guaranteed Mythic or Divine card at 100 packs.
                  </div>
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

      {/* Wardrobe Section */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] mb-8">
        <h2 className="text-2xl font-black text-[var(--text)] mb-6 flex items-center gap-2 uppercase">
          <ShoppingBag className="w-6 h-6 text-blue-500" />
          Wardrobe
        </h2>
        
        {loadingCosmetics ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : userCosmetics.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg)] rounded-xl border-2 border-dashed border-[var(--border)]">
            <p className="text-slate-500 font-bold">No cosmetics owned yet.</p>
            <p className="text-xs text-slate-400 mt-1">Earn them from the Season Pass!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {['profile_avatar', 'profile_banner', 'card_back'].map(type => {
              const items = userCosmetics.filter(c => c.item_type === type);
              
              return (
                <div key={type} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    {type === 'profile_avatar' && <UserIcon className="w-4 h-4" />}
                    {type === 'profile_banner' && <ImageIcon className="w-4 h-4" />}
                    {type === 'card_back' && <Shirt className="w-4 h-4" />}
                    {type.replace('profile_', '').replace('_', ' ')}s
                  </h3>
                  
                  <div className="space-y-3">
                    {items.map(item => (
                      <div 
                        key={item.user_item_id}
                        className={cn(
                          "group relative p-3 rounded-xl border-2 transition-all flex items-center gap-3",
                          item.is_equipped 
                            ? "bg-blue-50 border-blue-400 shadow-[2px_2px_0px_0px_rgba(59,130,246,0.5)]" 
                            : "bg-[var(--bg)] border-[var(--border)] hover:border-slate-400"
                        )}
                      >
                        <div className="w-12 h-12 rounded-lg border-2 border-[var(--border)] overflow-hidden bg-white shrink-0">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-[var(--text)] truncate uppercase">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 truncate">{item.description}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (item.is_equipped) {
                              handleUnequip(type);
                            } else {
                              setConfirmConfig({
                                isOpen: true,
                                title: `Equip ${item.name}`,
                                message: `Do you want to equip this ${type.replace('profile_', '').replace('_', ' ')}?`,
                                variant: 'primary',
                                onConfirm: () => handleEquip(item.user_item_id)
                              });
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-black text-[10px] uppercase border-2 transition-all",
                            item.is_equipped
                              ? "bg-white text-blue-600 border-blue-400"
                              : "bg-blue-500 text-white border-blue-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-y-[-2px] active:translate-y-[0px]"
                          )}
                        >
                          {item.is_equipped ? 'Unequip' : 'Equip'}
                        </button>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">No {type.replace('profile_', '').replace('_', ' ')}s owned</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Achievements / Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <RecentPulls />
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
                  <h3 className="font-black text-[var(--text)] uppercase truncate">{ach.title || ach.name}</h3>
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
