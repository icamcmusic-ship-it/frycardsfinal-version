import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Trophy, Zap, PackageOpen, LayoutGrid, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export function Home() {
  const { profile } = useProfileStore();
  const [quests, setQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [currentEnergy, setCurrentEnergy] = useState(() => {
    const energy = profile?.energy;
    if (energy === null || energy === undefined) return 0;
    
    // If it's an object, check for 'energy' property
    if (typeof energy === 'object') {
        return Number((energy as any)?.energy || 0);
    }
    
    return Number(energy);
  });
  const [nextRegen, setNextRegen] = useState<number | null>(null);

  const [stats, setStats] = useState<{ unique_cards: number; total_possible: number; total_cards: number } | null>(null);
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
    if (currentEnergy < 20 && profile?.energy_last_regen) {
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
  }, [currentEnergy, profile?.energy_last_regen]);

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile?.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim quest');
    }
  };

  const handleClaimDailyReward = async () => {
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward');
      if (error) throw error;
      
      setReward(data);
      
      // Rich toast
      toast.success((t) => (
        <div className="flex flex-col gap-1">
          <p className="font-black uppercase">Daily Reward Claimed!</p>
          <div className="text-sm font-bold">
            {data.gold_earned > 0 && <p className="text-yellow-600">+{data.gold_earned} Gold</p>}
            {data.gems_earned > 0 && <p className="text-emerald-600">+{data.gems_earned} Gems</p>}
            {data.xp_earned > 0 && <p className="text-blue-600">+{data.xp_earned} XP</p>}
            <p className="text-xs mt-1 text-slate-500">Streak: {data.current_streak} days</p>
          </div>
        </div>
      ), { duration: 5000 });
      
      // Refresh profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile?.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim daily reward');
    }
  };

  const isDailyClaimable = () => {
    if (!profile?.last_daily_claim) return true;
    const lastClaim = new Date(profile.last_daily_claim + 'T00:00:00Z');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today.getTime() > lastClaim.getTime();
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
              <div className="flex flex-col items-start gap-1">
                {profile.daily_streak > 0 && (
                  <p className="text-xs font-black text-black">🔥 {profile.daily_streak} day streak — keep it going!</p>
                )}
                <button 
                  onClick={handleClaimDailyReward}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                >
                  <Trophy className="w-6 h-6" />
                  Claim Daily Reward
                </button>
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
              <p className="text-3xl font-black text-[var(--text)] font-mono">{currentEnergy} / 20</p>
              {currentEnergy < 20 && nextRegen && (
                <span className="text-xs font-bold text-slate-500">
                  +1 in {Math.max(0, Math.ceil((nextRegen - Date.now()) / 60000))}m
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
                    <p className="font-bold text-black text-lg">{quest.quest_type.replace(/_/g, ' ').toUpperCase()}</p>
                    <div className="w-full sm:w-48 h-3 bg-white border-2 border-[var(--border)] rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-green-400 border-r-2 border-[var(--border)] transition-all" 
                        style={{ width: `${Math.min(100, (quest.progress / quest.target_value) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <p className="text-lg font-black text-black">{quest.progress} / {quest.target_value}</p>
                  {quest.is_completed && !quest.is_claimed ? (
                    <button 
                      onClick={() => { console.log('Claim clicked'); handleClaimQuest(quest.id); }}
                      className="px-4 py-1 bg-green-400 hover:bg-green-500 text-black font-black text-sm rounded-lg border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)] active:translate-y-1 active:shadow-none transition-all"
                    >
                      Claim Reward
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
               'Reward Claimed!'}
            </h2>
            <div className="text-xl font-bold text-slate-700 mb-6">
              {reward.gold_earned > 0 && <p className="text-yellow-600">+{reward.gold_earned} Gold</p>}
              {reward.gems_earned > 0 && <p className="text-emerald-600">+{reward.gems_earned} Gems</p>}
              {reward.xp_earned > 0 && <p className="text-blue-600">+{reward.xp_earned} XP</p>}
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
