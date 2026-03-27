import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Gift, Coins, Gem, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface SetProgressProps {
  set: {
    id: string;
    name: string;
    description: string;
    total_cards: number;
    owned_cards: number;
    reward_type: 'gold' | 'gems' | 'pack';
    reward_amount: number;
    is_claimed: boolean;
  };
  onClaimed: () => void;
}

export function SetProgress({ set, onClaimed }: SetProgressProps) {
  const [claiming, setClaiming] = useState(false);
  const progressPct = Math.min(100, (set.owned_cards / set.total_cards) * 100);
  const isComplete = set.owned_cards >= set.total_cards;

  const handleClaim = async () => {
    if (claiming || !isComplete || set.is_claimed) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_set_reward', { p_set_id: set.id });
      if (error) throw error;
      
      toast.success(`Claimed ${set.name} reward!`, { icon: '🏆' });
      onClaimed();
      await useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={cn(
      "bg-[var(--surface)] border-4 rounded-2xl p-6 shadow-[6px_6px_0px_0px_var(--border)] transition-all",
      set.is_claimed ? "opacity-75 border-slate-300" : isComplete ? "border-emerald-500 bg-emerald-50" : "border-[var(--border)]"
    )}>
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className={cn("w-6 h-6", isComplete ? "text-emerald-500" : "text-slate-400")} />
            <h3 className="text-xl font-black uppercase text-[var(--text)]">{set.name}</h3>
          </div>
          <p className="text-slate-600 font-bold mb-4">{set.description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-black uppercase">
              <span className="text-slate-500">Collection Progress</span>
              <span className={isComplete ? "text-emerald-600" : "text-blue-600"}>
                {set.owned_cards} / {set.total_cards}
              </span>
            </div>
            <div className="h-4 bg-slate-200 rounded-full border-2 border-[var(--border)] overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  isComplete ? "bg-emerald-500" : "bg-blue-500"
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 min-w-[160px]">
          <div className="text-right w-full">
            <p className="text-xs font-black uppercase text-slate-500 mb-1">Set Reward</p>
            <div className="flex items-center justify-end gap-2 text-xl font-black">
              {set.reward_type === 'gold' ? <Coins className="w-5 h-5 text-yellow-500" /> : 
               set.reward_type === 'gems' ? <Gem className="w-5 h-5 text-emerald-500" /> : 
               <Gift className="w-5 h-5 text-purple-500" />}
              <span>{set.reward_amount}</span>
            </div>
          </div>

          {set.is_claimed ? (
            <div className="w-full py-2 px-4 rounded-xl font-black uppercase border-2 border-emerald-200 bg-emerald-100 text-emerald-600 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Claimed
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={!isComplete || claiming}
              className={cn(
                "w-full py-2 px-4 rounded-xl font-black uppercase border-2 transition-transform active:translate-y-1 flex items-center justify-center gap-2",
                isComplete 
                  ? "bg-emerald-400 hover:bg-emerald-500 text-black border-black shadow-[3px_3px_0px_0px_black]" 
                  : "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"
              )}
            >
              {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : isComplete ? 'Claim Reward' : 'In Progress'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
