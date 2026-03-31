import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Trophy, Sparkles, Loader2, Gift, Coins, Gem, PackageOpen, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface DailySpinnerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailySpinner({ isOpen, onClose }: DailySpinnerProps) {
  const { profile, refreshProfile } = useProfileStore();
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinLandedIndex, setSpinLandedIndex] = useState<number | null>(null);
  const [reward, setReward] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSectors();
    }
  }, [isOpen]);

  const fetchSectors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_daily_spinner_sectors');
      if (error) throw error;
      setSectors(data || []);
    } catch (err) {
      console.error('Error fetching spinner sectors:', err);
      toast.error('Failed to load spinner');
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || claiming) return;
    setIsSpinning(true);
    setClaiming(true);
    
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward');
      if (error) throw error;

      // Find which sector the reward belongs to
      const landedIndex = sectors.findIndex(s => 
        s.reward_type === data.reward_type && s.reward_amount === data.reward_amount
      );

      // If not found (fallback), pick a random one that matches reward type
      const finalIndex = landedIndex !== -1 ? landedIndex : 
        sectors.findIndex(s => s.reward_type === data.reward_type);

      setSpinLandedIndex(finalIndex);

      // Wait for animation
      setTimeout(async () => {
        setIsSpinning(false);
        setClaiming(false);
        setReward(data);
        await refreshProfile();
      }, 4000);

    } catch (err: any) {
      toast.error(err.message || 'Failed to claim reward');
      setIsSpinning(false);
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--surface)] border-8 border-black rounded-3xl p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
      >
        <button 
          onClick={() => !isSpinning && onClose()}
          className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors"
          disabled={isSpinning}
        >
          <X className={cn("w-6 h-6", isSpinning && "opacity-20")} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Daily Spinner</h2>
          <p className="text-slate-500 font-bold">Spin the wheel to claim your daily reward!</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <div className="relative aspect-square w-full max-w-[280px] mx-auto mb-8">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-8 h-10 bg-red-500 border-4 border-black rounded-b-full shadow-lg" />
              </div>

              {/* Wheel */}
              <motion.div 
                className="w-full h-full rounded-full border-8 border-black relative overflow-hidden shadow-2xl"
                animate={{ 
                  rotate: isSpinning 
                    ? 360 * 10 + (spinLandedIndex !== null ? (360 - (spinLandedIndex * (360 / sectors.length))) : 0)
                    : spinLandedIndex !== null ? (360 - (spinLandedIndex * (360 / sectors.length))) : 0
                }}
                transition={{ 
                  duration: isSpinning ? 4 : 0, 
                  ease: [0.15, 0, 0.15, 1] 
                }}
              >
                {sectors.map((sector, i) => {
                  const angle = 360 / sectors.length;
                  const rotation = i * angle;
                  return (
                    <div 
                      key={i}
                      className="absolute top-0 left-1/2 w-1/2 h-full origin-left"
                      style={{ 
                        transform: `rotate(${rotation}deg)`,
                        backgroundColor: sector.color || '#ccc',
                        clipPath: `polygon(0 0, 100% 0, 100% ${Math.tan((angle * Math.PI) / 180) * 100}%, 0 0)`
                      }}
                    >
                      <div 
                        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-black whitespace-nowrap uppercase"
                        style={{ transform: `rotate(${angle / 2}deg) translateY(-20px)` }}
                      >
                        {sector.label}
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Center Cap */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white border-4 border-black rounded-full z-10 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning || claiming}
              className={cn(
                "w-full py-4 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-black text-xl rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest transition-all active:translate-y-1 active:shadow-none",
                isSpinning && "animate-pulse"
              )}
            >
              {isSpinning ? 'Spinning...' : 'Spin Now!'}
            </button>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {reward && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setReward(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
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
                onClick={() => { setReward(null); onClose(); }}
                className="w-full py-3 bg-black text-white font-black rounded-xl border-4 border-black hover:bg-gray-800 transition-colors"
              >
                Collect
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
