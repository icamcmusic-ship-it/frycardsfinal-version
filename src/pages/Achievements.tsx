import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Trophy, Lock, Check, Star, Zap, Target, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_achievements');
      if (error) throw error;
      setAchievements(data || []);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked_at).length;
  const totalCount = achievements.length;
  const progressPct = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Achievements
        </h1>
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl px-6 py-3 shadow-[4px_4px_0px_0px_var(--border)]">
          <p className="text-xs font-black uppercase text-slate-500 mb-1">Overall Progress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-[var(--bg)] rounded-full border-2 border-[var(--border)] overflow-hidden w-48">
              <motion.div 
                className="h-full bg-yellow-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <span className="font-black text-[var(--text)]">{unlockedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => {
          const isUnlocked = !!achievement.unlocked_at;
          const progress = achievement.progress || 0;
          const target = achievement.target_value || 1;
          const currentPct = Math.min(100, (progress / target) * 100);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "bg-[var(--surface)] border-4 rounded-2xl p-6 shadow-[6px_6px_0px_0px_var(--border)] relative overflow-hidden group transition-all",
                isUnlocked ? "border-yellow-400" : "border-[var(--border)] opacity-75"
              )}
            >
              {isUnlocked && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-black px-3 py-1 font-black text-[10px] uppercase rounded-bl-xl border-l-2 border-b-2 border-black z-10">
                  Unlocked
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_black]",
                  isUnlocked ? "bg-yellow-100" : "bg-slate-100"
                )}>
                  {isUnlocked ? (
                    <Award className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase text-[var(--text)] leading-tight">{achievement.name}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">{achievement.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                  <span>Progress</span>
                  <span>{progress.toLocaleString()} / {target.toLocaleString()}</span>
                </div>
                <div className="w-full h-3 bg-[var(--bg)] rounded-full border-2 border-[var(--border)] overflow-hidden">
                  <motion.div 
                    className={cn("h-full rounded-full", isUnlocked ? "bg-yellow-400" : "bg-blue-400")}
                    initial={{ width: 0 }}
                    animate={{ width: `${currentPct}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              {achievement.reward_type && (
                <div className="mt-4 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Reward</span>
                  <div className="flex items-center gap-1.5">
                    {achievement.reward_type === 'gold' && <Star className="w-4 h-4 text-yellow-500" />}
                    {achievement.reward_type === 'gems' && <Zap className="w-4 h-4 text-emerald-500" />}
                    <span className="font-black text-sm text-[var(--text)]">
                      {achievement.reward_value} {achievement.reward_type}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-20 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[8px_8px_0px_0px_var(--border)]">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-[var(--text)] uppercase">No Achievements</h2>
          <p className="text-slate-500 font-bold">Check back later for new challenges!</p>
        </div>
      )}
    </div>
  );
}
