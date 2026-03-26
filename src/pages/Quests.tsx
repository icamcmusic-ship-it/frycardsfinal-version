import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Target, CheckCircle2, Gift, Coins, Gem, Zap, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Quests() {
  const { profile } = useProfileStore();
  const [quests, setQuests] = useState<any[]>([]);
  const [dailyMissions, setDailyMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [profile]);

  const fetchAll = async () => {
    if (!profile) return;
    setLoading(true);
    await Promise.all([fetchQuests(), fetchDailyMissions()]);
    setLoading(false);
  };

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_quests');
      if (error) throw error;
      setQuests(data || []);
    } catch (err) {
      console.error('Error fetching quests:', err);
    }
  };

  const fetchDailyMissions = async () => {
    try {
      const { data, error } = await supabase.rpc('ensure_and_get_daily_missions', { p_user_id: profile?.id });
      if (error) throw error;
      setDailyMissions(data || []);
    } catch (err) {
      console.error('Error fetching daily missions:', err);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    if (claiming) return;
    setClaiming(questId);
    try {
      const { error } = await supabase.rpc('claim_quest_reward', {
        p_user_quest_id: questId
      });
      if (error) throw error;
      
      toast.success('Quest reward claimed!', { icon: '🎁' });
      fetchQuests();
      await useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimDaily = async (missionId: string) => {
    if (claiming) return;
    setClaiming(missionId);
    try {
      const { data, error } = await supabase.rpc('claim_daily_mission', { p_mission_id: missionId });
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Daily mission reward claimed!', { icon: '⚡' });
      }
      fetchDailyMissions();
      await useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg mb-2"></div>
          <div className="h-5 w-64 bg-slate-200 animate-pulse rounded-lg"></div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-40 bg-slate-200 animate-pulse rounded-lg"></div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[6px_6px_0px_0px_var(--border)]">
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-slate-200 animate-pulse rounded-full"></div>
                    <div className="h-6 w-48 bg-slate-200 animate-pulse rounded"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded"></div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-16 bg-slate-200 animate-pulse rounded"></div>
                      <div className="h-4 w-12 bg-slate-200 animate-pulse rounded"></div>
                    </div>
                    <div className="h-4 bg-slate-200 animate-pulse rounded-full border-2 border-[var(--border)]"></div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 min-w-[140px] w-full md:w-auto border-t-2 md:border-t-0 md:border-l-2 border-[var(--border)] pt-4 md:pt-0 md:pl-6">
                  <div className="text-right w-full flex flex-col items-end">
                    <div className="h-3 w-12 bg-slate-200 animate-pulse rounded mb-1"></div>
                    <div className="h-6 w-16 bg-slate-200 animate-pulse rounded"></div>
                  </div>
                  <div className="w-full h-10 bg-slate-200 animate-pulse rounded-xl border-2 border-[var(--border)]"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeQuests = quests.filter(q => !q.claimed);
  const completedQuests = quests.filter(q => q.claimed);

  const activeDaily = dailyMissions.filter(m => !m.is_claimed);
  const completedDaily = dailyMissions.filter(m => m.is_claimed);

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase flex items-center gap-3">
          <Target className="w-10 h-10 text-blue-500" />
          Missions & Quests
        </h1>
        <p className="text-slate-600 font-bold mt-1">Complete tasks to earn rewards and progress your duelist career</p>
      </div>

      {/* Daily Missions Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase text-[var(--text)] flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Daily Missions
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase">Resets Daily</span>
        </div>
        
        <div className="grid gap-4">
          {dailyMissions.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold">
              No daily missions available.
            </div>
          ) : (
            <>
              {activeDaily.map(mission => (
                <DailyMissionCard 
                  key={mission.id} 
                  mission={mission} 
                  onClaim={() => handleClaimDaily(mission.id)}
                  claiming={claiming === mission.id}
                />
              ))}
              
              {completedDaily.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-black uppercase text-slate-400">Completed Today</h3>
                  <div className="grid gap-4 opacity-60 grayscale-[0.5]">
                    {completedDaily.map(mission => (
                      <DailyMissionCard 
                        key={mission.id} 
                        mission={mission} 
                        onClaim={() => {}}
                        claiming={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Epic Quests Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase text-[var(--text)] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-500" />
            Epic Quests
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase">Long-term Goals</span>
        </div>

        {activeQuests.length === 0 && completedQuests.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold">
            No epic quests available.
          </div>
        ) : (
          <div className="space-y-6">
            {activeQuests.length > 0 && (
              <div className="grid gap-4">
                {activeQuests.map(quest => (
                  <QuestCard 
                    key={quest.id} 
                    quest={quest} 
                    onClaim={() => handleClaimQuest(quest.id)}
                    claiming={claiming === quest.id}
                  />
                ))}
              </div>
            )}

            {completedQuests.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-black uppercase text-slate-400">Completed</h3>
                <div className="grid gap-4 opacity-75">
                  {completedQuests.map(quest => (
                    <QuestCard 
                      key={quest.id} 
                      quest={quest} 
                      onClaim={() => {}}
                      claiming={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyMissionCard({ mission, onClaim, claiming }: { key?: React.Key, mission: any, onClaim: () => void | Promise<void>, claiming: boolean }) {
  const isCompleted = mission.is_completed;
  const isClaimed = mission.is_claimed;
  const progressPercent = Math.min(100, (mission.progress / mission.target_value) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-[var(--surface)] border-4 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_var(--border)]",
        isClaimed ? "border-slate-200 bg-slate-50" : 
        isCompleted ? "border-yellow-400 bg-yellow-50" : "border-[var(--border)]"
      )}
    >
      <div className="flex-1 w-full">
        <div className="flex items-center gap-3 mb-1">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border-2",
            isClaimed ? "bg-slate-100 border-slate-200" : "bg-blue-100 border-blue-200"
          )}>
            <Zap className={cn("w-4 h-4", isClaimed ? "text-slate-400" : "text-blue-600")} />
          </div>
          <h3 className="font-black uppercase text-[var(--text)]">{mission.quest_type.replace(/_/g, ' ')}</h3>
        </div>
        
        {!isClaimed && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="text-slate-500">Progress</span>
              <span className="text-blue-600">{mission.progress} / {mission.target_value}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full border border-[var(--border)] overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", isCompleted ? "bg-yellow-400" : "bg-blue-400")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-500">Reward</p>
          <div className="flex items-center gap-1 font-black">
            {mission.reward_type === 'gold' ? <Coins className="w-4 h-4 text-yellow-500" /> : <Gem className="w-4 h-4 text-emerald-500" />}
            <span>{mission.reward_amount}</span>
          </div>
        </div>

        {isClaimed ? (
          <span className="px-4 py-1.5 bg-slate-100 text-slate-400 font-black text-xs rounded-lg border-2 border-slate-200 uppercase">Claimed</span>
        ) : (
          <button
            onClick={onClaim}
            disabled={!isCompleted || claiming}
            className={cn(
              "px-4 py-1.5 rounded-lg font-black text-xs uppercase border-2 transition-all",
              isCompleted 
                ? "bg-green-400 hover:bg-green-500 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none" 
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            )}
          >
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : isCompleted ? 'Claim' : 'Active'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function QuestCard({ quest, onClaim, claiming }: { key?: React.Key, quest: any, onClaim: () => void | Promise<void>, claiming: boolean }) {
  const isCompleted = quest.progress >= quest.target_value;
  const progressPercent = Math.min(100, (quest.progress / quest.target_value) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-[var(--surface)] border-4 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[6px_6px_0px_0px_var(--border)] transition-all",
        quest.claimed ? "border-slate-300 bg-slate-50" : 
        isCompleted ? "border-emerald-500 bg-emerald-50" : "border-[var(--border)]"
      )}
    >
      <div className="flex-1 w-full">
        <div className="flex items-center gap-3 mb-2">
          {quest.claimed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : isCompleted ? (
            <Gift className="w-6 h-6 text-emerald-500 animate-bounce" />
          ) : (
            <Target className="w-6 h-6 text-blue-500" />
          )}
          <h3 className="text-xl font-black uppercase text-[var(--text)]">{quest.title}</h3>
        </div>
        <p className="text-slate-600 font-bold mb-4">{quest.description}</p>
        
        {!quest.claimed && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-black uppercase">
              <span className="text-slate-500">Progress</span>
              <span className={isCompleted ? "text-emerald-600" : "text-blue-600"}>
                {quest.progress} / {quest.target_value}
              </span>
            </div>
            <div className="h-4 bg-slate-200 rounded-full border-2 border-[var(--border)] overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  isCompleted ? "bg-emerald-500" : "bg-blue-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-3 min-w-[140px] w-full md:w-auto border-t-2 md:border-t-0 md:border-l-2 border-[var(--border)] pt-4 md:pt-0 md:pl-6">
        <div className="text-right w-full">
          <p className="text-xs font-black uppercase text-slate-500 mb-1">Reward</p>
          <div className="flex items-center justify-end gap-2 text-xl font-black">
            {quest.reward_type === 'gold' ? (
              <Coins className="w-5 h-5 text-yellow-500" />
            ) : quest.reward_type === 'gems' ? (
              <Gem className="w-5 h-5 text-emerald-500" />
            ) : (
              <Gift className="w-5 h-5 text-purple-500" />
            )}
            <span>{quest.reward_amount}</span>
          </div>
        </div>

        {!quest.claimed && (
          <button
            onClick={onClaim}
            disabled={!isCompleted || claiming}
            className={cn(
              "w-full py-2 px-4 rounded-xl font-black uppercase border-2 transition-transform active:translate-y-1 flex items-center justify-center gap-2",
              isCompleted 
                ? "bg-emerald-400 hover:bg-emerald-500 text-black border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]" 
                : "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"
            )}
          >
            {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : isCompleted ? 'Claim Reward' : 'In Progress'}
          </button>
        )}
        
        {quest.claimed && (
          <div className="w-full py-2 px-4 rounded-xl font-black uppercase border-2 border-emerald-200 bg-emerald-100 text-emerald-600 flex items-center justify-center">
            Claimed
          </div>
        )}
      </div>
    </motion.div>
  );
}
