import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Trophy, PackageOpen, LayoutGrid, ChevronRight, Loader2, Sparkles, Coins, Gem, Gift, Package, ShieldAlert, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

import { DailySpinner } from '../components/DailySpinner';

export function Home() {
  const { profile } = useProfileStore();
  const [quests, setQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);

  const [stats, setStats] = useState<{ unique_cards: number; total_possible: number; total_cards: number } | null>(null);
  const [passData, setPassData] = useState<any>(null);
  const [passTiers, setPassTiers] = useState<any[]>([]);
  const [claimingQuest, setClaimingQuest] = useState<string | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [userPacks, setUserPacks] = useState<any[]>([]);
  const [userQuests, setUserQuests] = useState<any[]>([]);
  const [loadingQuestsNew, setLoadingQuestsNew] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchUserPacks();
      fetchUserQuests();
    }
  }, [profile]);

  const fetchUserPacks = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_pack_inventory');
      if (error) throw error;
      setUserPacks(data || []);
    } catch (err) {
      console.error('Error fetching user packs:', err);
    }
  };

  const fetchUserQuests = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_quests');
      if (error) throw error;
      setUserQuests(data || []);
    } catch (err) {
      console.error('Error fetching user quests:', err);
    } finally {
      setLoadingQuestsNew(false);
    }
  };

  const isDailyClaimable = () => {
    if (!profile?.last_daily_claim) return true;
    const lastClaim = profile.last_daily_claim || "2000-01-01";
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return localDate > lastClaim;
  };

  useEffect(() => {
    if (profile) {
      fetchQuests();
      
      supabase.rpc('get_my_collection_stats').then(({ data }) => {
        if (data) setStats(data);
      });

      supabase.rpc('get_or_create_season_pass', { p_season: 1 }).then(({ data }) => {
        if (data) setPassData(data);
      });

      supabase.from('season_pass_tiers').select('*').order('tier').then(({ data }) => {
        if (data) setPassTiers(data);
      });
      
      if (isDailyClaimable()) {
        setShowDailyPreview(true);
      }
    }
  }, [profile]);

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase.rpc('ensure_and_get_daily_missions', { p_user_id: profile?.id });
      if (error) {
        console.error('Error fetching quests:', error);
        setQuests([]); // Set empty array on error
        return;
      }
      setQuests(data || []);
    } catch (err) {
      console.error('Error fetching quests:', err);
      setQuests([]);
    } finally {
      setLoadingQuests(false);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    if (claimingQuest) return;
    setClaimingQuest(questId);
    try {
      const { data, error } = await supabase.rpc('claim_daily_mission', { p_mission_id: questId });
      if (error) throw error;
      
      if (data?.success) {
        const rewards = [];
        if (data.gold_earned) rewards.push(`${data.gold_earned} Gold`);
        if (data.gems_earned) rewards.push(`${data.gems_earned} Gems`);
        if (data.xp_earned) rewards.push(`${data.xp_earned} XP`);
        toast.success(`Claimed! +${rewards.join(', ')}`);
      } else {
        toast.success('Quest reward claimed!');
      }
      
      await fetchQuests();
      
      // Refresh profile to update gold/gems
      await useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim quest');
    } finally {
      setClaimingQuest(null);
    }
  };

  const handleOpenSpinner = () => {
    setShowSpinner(true);
    setShowDailyPreview(false);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-blue-400 border-4 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-yellow-300 rounded-full border-4 border-black opacity-50" />
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight uppercase">
            Welcome back, <br/><span className="text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">{profile.username || 'Duelist'}</span>
          </h1>
          <div className="flex flex-wrap gap-3 mb-8">
            <p className="text-xl text-black font-bold bg-white/50 inline-block px-3 py-1 border-2 border-black rounded-lg transform -rotate-1">
              Level {profile.level} • {profile.xp} XP
            </p>
            {passData && (
              <Link to="/season-pass" className="text-xl text-black font-bold bg-yellow-300 hover:bg-yellow-400 transition-colors inline-block px-3 py-1 border-2 border-black rounded-lg transform rotate-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Pass Tier {passTiers.filter(t => t.xp_required <= (passData?.xp_earned ?? 0)).length}
              </Link>
            )}
          </div>
          
          {profile.daily_streak > 0 && (
            <div className="flex flex-col gap-2 mb-8">
              <p className="text-sm font-bold text-black bg-orange-300 inline-flex items-center gap-1 px-3 py-1 border-2 border-black rounded-lg transform rotate-1 w-fit">
                🔥 {profile.daily_streak} Day Streak
              </p>
              <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={cn(
                    "w-6 h-6 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                    i < Math.min(profile.daily_streak, 7) ? "bg-green-400" : "bg-white/30"
                  )} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-8">
            <Link 
              to="/store"
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-lg rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
            >
              <PackageOpen className="w-6 h-6" />
              Open Packs
            </Link>
            {isDailyClaimable() && (
              <div className="flex flex-col items-start gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black uppercase animate-bounce">
                    <Sparkles className="w-3 h-3" />
                    {profile.daily_streak >= 3 ? 'Streak Bonus Active' : `Streak Day ${profile.daily_streak}`}
                  </div>
                  <p className="text-xs font-black text-black/60 uppercase tracking-wider">
                    {profile.daily_streak >= 30 ? '🔥 Tier 5 Rewards Available' :
                     profile.daily_streak >= 14 ? '💎 Tier 4 Rewards Available' :
                     profile.daily_streak >= 7 ? '✨ Tier 3 Rewards Available' : 
                     profile.daily_streak >= 3 ? '🌟 Tier 2 Rewards Available' : 
                     '🎁 Tier 1 Rewards Available'}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleOpenSpinner}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    <Trophy className="w-6 h-6" />
                    Reveal Reward
                  </button>
                  
                  {profile.last_reward_type && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm border-2 border-black/20 rounded-lg">
                      <p className="text-[10px] font-black uppercase text-black/60">Last Won:</p>
                      <p className="text-[10px] font-black uppercase text-black">{profile.last_reward_type.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  
                  <div className="hidden sm:flex items-center gap-2 bg-black/10 backdrop-blur-sm border-2 border-black/20 rounded-xl px-3 py-2">
                    <div className="text-[10px] font-black uppercase text-black/60 leading-none">
                      Potential<br/>Rewards
                    </div>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded bg-yellow-400 border border-black flex items-center justify-center" title="Gold">
                        <Coins className="w-3 h-3 text-black" />
                      </div>
                      {profile.daily_streak >= 3 && (
                        <div className="w-6 h-6 rounded bg-emerald-400 border border-black flex items-center justify-center" title="Gems">
                          <Gem className="w-3 h-3 text-black" />
                        </div>
                      )}
                      {profile.daily_streak >= 7 && (
                        <div className="w-6 h-6 rounded bg-purple-400 border border-black flex items-center justify-center" title="Packs/Rare Cards">
                          <PackageOpen className="w-3 h-3 text-black" />
                        </div>
                      )}
                      {profile.daily_streak >= 14 && (
                        <div className="w-6 h-6 rounded bg-red-400 border border-black flex items-center justify-center" title="Epic Rewards">
                          <Sparkles className="w-3 h-3 text-black" />
                        </div>
                      )}
                      {profile.daily_streak >= 30 && (
                        <div className="w-6 h-6 rounded bg-black border border-black flex items-center justify-center" title="Legendary Rewards">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Season Pass Progress Widget */}
      {passData && passTiers.length > 0 && (
        <Link to="/season-pass" className="block group">
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] group-hover:translate-y-[-4px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-400 border-4 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_black]">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text)] uppercase leading-none">Season Pass</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">Season {passData.season || 1} • {passData.is_premium ? 'Premium' : 'Free'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-500">Tier {passTiers.filter(t => t.xp_required <= (passData?.xp_earned ?? 0)).length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  {(() => {
                    const userLevel = passTiers.filter(t => t.xp_required <= (passData?.xp_earned ?? 0)).length;
                    const nextTier = passTiers.find(t => t.tier > userLevel);
                    if (!nextTier) return 'MAX TIER';
                    const userXP = passData.xp_earned || 0;
                    const currentTier = passTiers.find(t => t.tier === userLevel);
                    const prevXP = currentTier ? currentTier.xp_required : 0;
                    return `${(userXP - prevXP).toLocaleString()} / ${(nextTier.xp_required - prevXP).toLocaleString()} XP`;
                  })()}
                </p>
              </div>
            </div>
            <div className="h-4 bg-[var(--bg)] rounded-full border-4 border-[var(--border)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                style={{ 
                  width: `${(() => {
                    const userLevel = passTiers.filter(t => t.xp_required <= (passData?.xp_earned ?? 0)).length;
                    const nextTier = passTiers.find(t => t.tier > userLevel);
                    if (!nextTier) return 100;
                    const userXP = passData.xp_earned || 0;
                    const currentTier = passTiers.find(t => t.tier === userLevel);
                    const prevXP = currentTier ? currentTier.xp_required : 0;
                    return Math.min(100, ((userXP - prevXP) / (nextTier.xp_required - prevXP)) * 100);
                  })()}%` 
                }}
              />
            </div>
          </div>
        </Link>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 flex items-center gap-4 shadow-[4px_4px_0px_0px_var(--border)] transform hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 rounded-xl bg-yellow-300 flex items-center justify-center border-4 border-[var(--border)] transform -rotate-3">
            <Trophy className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-bold uppercase">Collection Score</p>
            <p className="text-3xl font-black text-[var(--text)] font-mono">{(stats?.total_cards ?? 0).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 flex items-center gap-4 shadow-[4px_4px_0px_0px_var(--border)] transform hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 rounded-xl bg-cyan-300 flex items-center justify-center border-4 border-[var(--border)] transform rotate-3">
            <LayoutGrid className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-bold uppercase">Unique Cards</p>
            <p className="text-3xl font-black text-[var(--text)] font-mono">{stats?.unique_cards ?? 0} / {stats?.total_possible ?? '?'}</p>
          </div>
        </div>
      </div>

      {/* My Packs Section */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 uppercase">
            <Package className="w-6 h-6 text-indigo-500" />
            My Packs
          </h2>
          {userPacks.length > 0 && <Link to="/store?tab=inventory" className="text-indigo-500 font-black uppercase text-sm hover:underline">View All</Link>}
        </div>
        
        {userPacks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {userPacks.slice(0, 6).map((pack) => (
              <Link
                key={pack.pack_id}
                to={`/store?tab=inventory`}
                className="group relative"
              >
                {/* Stack Deco */}
                {pack.quantity > 1 && (
                  <div className="absolute inset-0 translate-x-1 translate-y-1 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl -z-10" />
                )}
                
                <div className="relative bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-2 shadow-[2px_2px_0px_0px_var(--border)] group-hover:translate-y-[-2px] transition-all h-full flex flex-col">
                  <div className="aspect-[3/4] mb-2 overflow-hidden rounded-lg border-2 border-[var(--border)] bg-indigo-50 flex items-center justify-center relative">
                    <img
                      src={pack.image_url}
                      alt={pack.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1 right-1 bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      ×{pack.quantity}
                    </div>
                  </div>
                  <div className="text-center mt-auto">
                    <p className="font-black text-[9px] uppercase truncate text-[var(--text)]">{pack.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-indigo-50 border-4 border-dashed border-indigo-200 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-2xl border-2 border-indigo-100 flex items-center justify-center mx-auto opacity-50">
              <PackageOpen className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              <p className="text-lg font-black text-indigo-900 uppercase">0 Packs Available</p>
              <p className="text-sm font-bold text-indigo-600/70">Visit the store to get your first pack or complete missions!</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link to="/store" className="px-6 py-2 bg-indigo-500 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_black] hover:translate-y-[-2px] transition-all">
                Go to Store
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Missions & Quests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Missions */}
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 uppercase">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Daily Missions
            </h2>
            <Link to="/quests" className="text-yellow-600 font-black uppercase text-sm hover:underline">Full List</Link>
          </div>
          
          <div className="space-y-4">
            {loadingQuests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : quests.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">No active missions.</div>
            ) : (
              quests.slice(0, 3).map((quest) => (
                <div key={quest.id} className="bg-white border-2 border-[var(--border)] rounded-xl p-4 flex flex-col items-stretch gap-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-100 border-2 border-[var(--border)] flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[var(--text)] text-sm uppercase truncate">{(quest.mission_type || quest.quest_type || '').replace(/_/g, ' ')}</p>
                      <div className="w-full h-2 bg-slate-100 border border-[var(--border)] rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-blue-400 transition-all duration-500" 
                          style={{ width: `${Math.min(100, (quest.progress / (quest.target || quest.target_value || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-11">
                    <p className="text-xs font-black text-slate-500">{quest.progress} / {quest.target || quest.target_value}</p>
                    {quest.is_completed && !quest.is_claimed ? (
                      <button 
                        onClick={() => handleClaimQuest(quest.id)}
                        disabled={claimingQuest === quest.id}
                        className="px-3 py-1 bg-green-400 hover:bg-green-500 disabled:opacity-50 text-black font-black text-[10px] rounded border-2 border-black shadow-[2px_2px_0px_0px_black] active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        {claimingQuest === quest.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'CLAIM'}
                      </button>
                    ) : quest.is_claimed ? (
                       <span className="text-[10px] text-emerald-500 font-black uppercase">Completed</span>
                    ) : (
                      <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                        <Coins className="w-3 h-3 text-yellow-600" />
                        <span className="text-[10px] font-black text-yellow-700">{quest.reward_amount || quest.reward_gold || 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Epic Quests */}
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 uppercase">
              <Trophy className="w-6 h-6 text-blue-500" />
              Epic Quests
            </h2>
            <Link to="/quests" className="text-blue-600 font-black uppercase text-sm hover:underline">View All</Link>
          </div>
          
          <div className="space-y-4">
            {loadingQuestsNew ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : userQuests.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">No active quests.</div>
            ) : (
              userQuests.slice(0, 3).map((quest) => (
                <div key={quest.id} className="bg-white border-2 border-[var(--border)] rounded-xl p-4 flex flex-col items-stretch gap-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-100 border-2 border-[var(--border)] flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[var(--text)] text-sm uppercase truncate">{quest.title}</p>
                      <div className="w-full h-2 bg-slate-100 border border-[var(--border)] rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-500" 
                          style={{ width: `${Math.min(100, (quest.current_value / quest.target_value) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-11">
                    <p className="text-xs font-black text-slate-500">{quest.current_value} / {quest.target_value}</p>
                    {quest.status === 'completed' ? (
                       <Link to="/quests" className="px-3 py-1 bg-indigo-400 hover:bg-indigo-500 text-black font-black text-[10px] rounded border-2 border-black shadow-[2px_2px_0px_0px_black] active:translate-y-0.5 active:shadow-none transition-all">
                         VIEW
                       </Link>
                    ) : quest.status === 'claimed' ? (
                       <span className="text-[10px] text-indigo-500 font-black uppercase">Claimed</span>
                    ) : (
                      <div className="flex items-center gap-1 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        <Gem className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700">{quest.reward_amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showDailyPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-3xl p-8 max-w-sm w-full shadow-[12px_12px_0px_0px_var(--border)] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, -5, 5, 0],
                scale: [1, 1.05, 1, 1.05, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-32 h-32 bg-emerald-100 rounded-2xl border-4 border-emerald-200 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_emerald-200]"
            >
              <Gift className="w-16 h-16 text-emerald-600" />
            </motion.div>

            <h2 className="text-3xl font-black text-[var(--text)] uppercase mb-2">Ready to Claim?</h2>
            <p className="text-slate-600 font-bold mb-8">Your daily reward is waiting! Tap below to reveal what's inside.</p>
            
            <div className="space-y-3">
              <button 
                onClick={handleOpenSpinner}
                disabled={claimingDaily}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-3"
              >
                {claimingDaily ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Reveal Reward
                  </>
                )}
              </button>
              <button 
                onClick={() => setShowDailyPreview(false)}
                className="w-full py-2 text-slate-400 font-black uppercase text-xs hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <DailySpinner 
        isOpen={showSpinner} 
        onClose={() => setShowSpinner(false)} 
      />
    </motion.div>
  );
}
