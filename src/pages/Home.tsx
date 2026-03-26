import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Trophy, Zap, PackageOpen, LayoutGrid, ChevronRight, Loader2, Sparkles, Coins, Gem, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export function Home() {
  const { profile } = useProfileStore();
  const [quests, setQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [currentEnergy, setCurrentEnergy] = useState(() => {
    return Number(profile?.energy || 0);
  });
  const [nextRegen, setNextRegen] = useState<number | null>(null);

  const [stats, setStats] = useState<{ unique_cards: number; total_possible: number; total_cards: number } | null>(null);
  const [claimingQuest, setClaimingQuest] = useState<string | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [reward, setReward] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      fetchQuests();
      fetchEnergy();
      
      supabase.rpc('get_my_collection_stats').then(({ data }) => {
        if (data) setStats(data);
      });
      
      const interval = setInterval(fetchEnergy, 5 * 60 * 1000); // Poll every 5 mins
      return () => clearInterval(interval);
    }
  }, [profile]);

  useEffect(() => {
    if (currentEnergy < (profile?.max_energy ?? 20) && profile?.energy_last_regen) {
      const regenTime = new Date(profile.energy_last_regen).getTime() + 15 * 60 * 1000;
      setNextRegen(regenTime);
      
      const timer = setInterval(() => {
        if (Date.now() >= regenTime) {
          fetchEnergy();
        } else {
          setNextRegen(regenTime); // Force re-render for countdown
        }
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setNextRegen(null);
    }
  }, [currentEnergy, profile?.energy_last_regen, profile?.max_energy]);

  const fetchEnergy = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase.rpc('get_current_energy', { p_user_id: profile.id });
      if (!error && data !== null) {
        setCurrentEnergy(data);
      }
    } catch (err) {
      console.error('Error fetching energy:', err);
    }
  };

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
      
      fetchQuests();
      
      // Refresh profile to update gold/gems
      await useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim quest');
    } finally {
      setClaimingQuest(null);
    }
  };

  const [showDailyPreview, setShowDailyPreview] = useState(false);

  const handleClaimDailyReward = async () => {
    if (claimingDaily) return;
    setClaimingDaily(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward');
      if (error) throw error;
      
      setReward(data);
      setShowDailyPreview(false);
      
      // Refresh profile
      await useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim daily reward');
    } finally {
      setClaimingDaily(false);
    }
  };

  const isDailyClaimable = () => {
    if (!profile?.last_daily_claim) return true;
    const lastClaim = profile.last_daily_claim; // e.g. "2026-03-12"
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD" in UTC
    return today > lastClaim;
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
          <p className="text-xl text-black font-bold mb-8 bg-white/50 inline-block px-3 py-1 border-2 border-black rounded-lg transform -rotate-1">
            Level {profile.level} • {profile.xp} XP
          </p>
          
          {profile.daily_streak > 0 && (
            <p className="text-sm font-bold text-black bg-orange-300 inline-flex items-center gap-1 px-3 py-1 border-2 border-black rounded-lg mt-1 mb-8 transform rotate-1">
              🔥 {profile.daily_streak} Day Streak
            </p>
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
                  {profile.daily_streak >= 3 && (
                    <div className="flex items-center gap-1 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black uppercase animate-bounce">
                      <Sparkles className="w-3 h-3" />
                      Streak Bonus Active
                    </div>
                  )}
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
                    onClick={() => setShowDailyPreview(true)}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    <Trophy className="w-6 h-6" />
                    Claim Daily Reward
                  </button>
                  
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

        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 flex items-center gap-4 shadow-[4px_4px_0px_0px_var(--border)] transform hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 rounded-xl bg-purple-300 flex items-center justify-center border-4 border-[var(--border)] transform -rotate-3">
            <Zap className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-bold uppercase">Energy</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-[var(--text)] font-mono">{currentEnergy} / {profile?.max_energy ?? 20}</p>
              {currentEnergy < (profile?.max_energy ?? 20) && nextRegen && (
                <span className="text-xs font-bold text-slate-500">
                  +1 in {(() => {
                    const diff = Math.max(0, nextRegen - Date.now());
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                  })()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Missions Preview */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 uppercase">
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Daily Missions
          </h2>
        </div>
        
        <div className="space-y-4">
          {loadingQuests ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : quests.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-bold">No active quests. Check back tomorrow!</div>
          ) : (
            quests.map((quest) => (
              <div key={quest.id} className="bg-gray-50 border-2 border-[var(--border)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 border-2 border-[var(--border)] flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[var(--text)] text-lg">{quest.quest_type.replace(/_/g, ' ').toUpperCase()}</p>
                    <div className="w-full sm:w-48 h-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-green-400 border-r-2 border-[var(--border)] transition-all" 
                        style={{ width: `${Math.min(100, (quest.progress / quest.target_value) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <p className="text-lg font-black text-[var(--text)]">{quest.progress} / {quest.target_value}</p>
                  {quest.is_completed && !quest.is_claimed ? (
                    <button 
                      onClick={() => { console.log('Claim clicked'); handleClaimQuest(quest.id); }}
                      disabled={claimingQuest === quest.id}
                      className="px-4 py-1 bg-green-400 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm rounded-lg border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      {claimingQuest === quest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim Reward'}
                    </button>
                  ) : quest.is_claimed ? (
                    <span className="text-sm text-slate-500 font-bold uppercase">Claimed</span>
                  ) : (
                    <p className="text-sm text-yellow-600 font-bold bg-yellow-100 px-2 py-0.5 rounded border border-yellow-400 inline-block">
                      +{quest.reward_amount} {quest.reward_type === 'gold' ? 'Gold' : 'Gems'}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
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
                onClick={handleClaimDailyReward}
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

      {reward && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setReward(null)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_var(--border)] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-[var(--text)] uppercase mb-2">
              {reward.reward_type === 'jackpot' ? '🎉 Jackpot!' :
               reward.reward_type === 'gem_cache' ? '💎 Gem Cache!' :
               reward.reward_type === 'gold_stash' ? '💰 Gold Stash!' :
               reward.reward_type === 'rare_card' ? '✨ Rare Card!' :
               reward.reward_type === 'pack_bundle' ? '📦 Pack Bundle!' :
               reward.reward_type === 'milestone_7' ? '🌟 7-Day Milestone!' :
               reward.reward_type === 'milestone_30' ? '🔥 30-Day Milestone!' :
               'Reward Claimed!'}
            </h2>
            <div className="text-xl font-bold text-slate-700 mb-6">
              {reward.gold_earned > 0 && <p className="text-yellow-600">+{reward.gold_earned} Gold</p>}
              {reward.gems_earned > 0 && <p className="text-emerald-600">+{reward.gems_earned} Gems</p>}
              {reward.xp_earned > 0 && <p className="text-blue-600">+{reward.xp_earned} XP</p>}
              {reward.packs_earned > 0 && <p className="text-purple-600">+{reward.packs_earned} Packs</p>}
              {reward.card_name && <p className="text-orange-500">New Card: {reward.card_name}</p>}
              <p className="mt-2 text-sm font-black text-blue-500 uppercase">Streak: {reward.current_streak} days</p>
            </div>
            <button 
              onClick={() => setReward(null)}
              className="w-full py-3 bg-black text-white font-black rounded-xl border-4 border-black hover:bg-gray-800 transition-colors"
            >
              Collect
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
