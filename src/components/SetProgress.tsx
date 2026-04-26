import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Gift, Coins, Gem, Check, Loader2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { SetDetailsModal } from './SetDetailsModal';

interface SetProgressProps {
  set: {
    id: string;
    name: string;
    description: string | null;
    total_cards: number;
    owned_cards: number;
    is_claimed: boolean;
    reward_type: 'gold' | 'gems' | 'item';
    reward_amount: number;
    reward_label: string | null;
    reward_gold: number;
    reward_gems: number;
    theme_color: string | null;
    is_complete: boolean;
  };
  onClaimed: () => void;
}

export function SetProgress({ set, onClaimed }: SetProgressProps) {
  const [claiming, setClaiming] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { profile } = useProfileStore();
  const isComplete = set.is_complete;
  const progressPct = set.total_cards > 0 
    ? Math.min(100, (set.owned_cards / set.total_cards) * 100) 
    : 0;

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
    <>
      <div 
        style={set.theme_color && !set.is_claimed ? { borderLeftColor: set.theme_color } : undefined}
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "bg-[var(--surface)] border-4 rounded-2xl p-6 shadow-[6px_6px_0px_0px_var(--border)] transition-all border-l-8 cursor-pointer group hover:scale-[1.01]",
          set.is_claimed ? "opacity-75 border-slate-300" : isComplete ? "border-emerald-500 bg-emerald-50" : "border-[var(--border)]"
        )}
      >
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className={cn("w-6 h-6", isComplete ? "text-emerald-500" : "text-slate-400")} />
              <h3 className="text-xl font-black uppercase text-[var(--text)] group-hover:text-blue-600 transition-colors">{set.name}</h3>
            </div>
            <p className="text-slate-600 font-bold mb-4">{set.description}</p>
            
            <div className="space-y-4">
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

              <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-xs">
                <Eye className="w-4 h-4" />
                View Collection Details
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 min-w-[160px]">
            <div className="text-right w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-black uppercase text-slate-500 mb-1">Set Reward</p>
            <div className="flex items-center justify-end gap-2 text-xl font-black">
              {set.reward_type === 'gold' ? <Coins className="w-5 h-5 text-yellow-500" /> : 
               set.reward_type === 'gems' ? <Gem className="w-5 h-5 text-emerald-500" /> : 
               <Gift className="w-5 h-5 text-purple-500" />}
              <span>{set.reward_label || set.reward_amount}</span>
            </div>
          </div>

          {set.is_claimed ? (
            <div className="w-full py-2 px-4 rounded-xl font-black uppercase border-2 border-emerald-200 bg-emerald-100 text-emerald-600 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Claimed
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleClaim(); }}
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
      
    <SetDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        set={set}
        userId={profile?.id}
      />
    </>
  );
}
