import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Trophy, Sparkles, Loader2, Gift, Coins, Gem, PackageOpen, X, Star, Zap } from 'lucide-react';
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
  const [rotation, setRotation] = useState(0);
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

  const pieSegments = useMemo(() => {
    if (sectors.length === 0) return [];
    
    let currentAngle = 0;
    const totalWeight = sectors.reduce((acc, s) => acc + (s.weight || 1), 0);
    
    return sectors.map((sector) => {
      const angle = ((sector.weight || 1) / totalWeight) * 360;
      const segment = {
        ...sector,
        startAngle: currentAngle,
        angle: angle,
        endAngle: currentAngle + angle
      };
      currentAngle += angle;
      return segment;
    });
  }, [sectors]);

  const handleSpin = async () => {
    if (isSpinning || claiming) return;
    setIsSpinning(true);
    setClaiming(true);
    
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward');
      if (error) throw error;

      // Find which sector the reward belongs to
      const landedIndex = pieSegments.findIndex(s => 
        s.reward_type === data.reward_type && s.reward_amount === data.reward_amount
      );

      const targetSegment = pieSegments[landedIndex !== -1 ? landedIndex : 0];
      
      // Calculate rotation to land on the segment
      // The pointer is at the top (0 degrees)
      // We want the middle of the segment to be at the top
      const segmentCenter = targetSegment.startAngle + (targetSegment.angle / 2);
      const extraSpins = 5 + Math.floor(Math.random() * 5);
      const newRotation = rotation + (extraSpins * 360) + (360 - segmentCenter) - (rotation % 360);
      
      setRotation(newRotation);

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

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
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
          className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors z-30"
          disabled={isSpinning}
        >
          <X className={cn("w-6 h-6", isSpinning && "opacity-20")} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 flex items-center justify-center gap-2">
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            Daily Spinner
          </h2>
          <p className="text-slate-500 font-bold">Spin the wheel to claim your daily reward!</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <div className="relative aspect-square w-full max-w-[300px] mx-auto mb-8">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-8 h-10 bg-red-500 border-4 border-black rounded-b-full shadow-lg" />
              </div>

              {/* Wheel SVG */}
              <motion.div 
                className="w-full h-full"
                animate={{ rotate: rotation }}
                transition={{ 
                  duration: isSpinning ? 4 : 0, 
                  ease: [0.15, 0, 0.15, 1] 
                }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                  <circle cx="100" cy="100" r="98" fill="black" />
                  {pieSegments.map((segment, i) => (
                    <g key={i}>
                      <path
                        d={describeArc(100, 100, 92, segment.startAngle, segment.endAngle)}
                        fill={segment.color || '#ccc'}
                        stroke="black"
                        strokeWidth="2"
                      />
                      <g transform={`rotate(${segment.startAngle + segment.angle / 2}, 100, 100)`}>
                        <text
                          x="100"
                          y="45"
                          textAnchor="middle"
                          className="text-[8px] font-black uppercase fill-black"
                          style={{ transform: 'rotate(0deg)' }}
                        >
                          {segment.label}
                        </text>
                      </g>
                    </g>
                  ))}
                  <circle cx="100" cy="100" r="15" fill="white" stroke="black" strokeWidth="4" />
                </svg>
              </motion.div>

              {/* Center Cap Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
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
              className="bg-[var(--surface)] border-8 border-black rounded-3xl p-8 max-w-sm w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400" />
              <div className="w-20 h-20 bg-yellow-100 rounded-2xl border-4 border-yellow-200 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_#fef08a]">
                <Trophy className="w-12 h-12 text-yellow-500" />
              </div>
              
              <h2 className="text-3xl font-black text-[var(--text)] uppercase mb-2 leading-tight">
                {reward.reward_type === 'jackpot' ? '🎉 Jackpot!' :
                 reward.reward_type === 'gem_cache' ? '💎 Gem Cache!' :
                 reward.reward_type === 'gold_stash' ? '💰 Gold Stash!' :
                 reward.reward_type === 'rare_card' ? '✨ Rare Card!' :
                 reward.reward_type === 'pack_bundle' ? '📦 Pack Bundle!' :
                 reward.reward_type === 'milestone_7' ? '🌟 7-Day Milestone!' :
                 reward.reward_type === 'milestone_30' ? '🔥 30-Day Milestone!' :
                 'Reward Claimed!'}
              </h2>
              
              <div className="space-y-2 mb-8">
                {reward.gold_earned > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xl font-black text-yellow-600">
                    <Coins className="w-6 h-6" />
                    +{reward.gold_earned.toLocaleString()} Gold
                  </div>
                )}
                {reward.gems_earned > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xl font-black text-emerald-600">
                    <Gem className="w-6 h-6" />
                    +{reward.gems_earned.toLocaleString()} Gems
                  </div>
                )}
                {reward.xp_earned > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xl font-black text-blue-600">
                    <Zap className="w-6 h-6" />
                    +{reward.xp_earned.toLocaleString()} XP
                  </div>
                )}
                {reward.packs_earned > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xl font-black text-purple-600">
                    <PackageOpen className="w-6 h-6" />
                    +{reward.packs_earned} Packs
                  </div>
                )}
                {reward.card_name && (
                  <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <p className="text-xs font-black text-blue-400 uppercase mb-1">New Card Unlocked!</p>
                    <p className="text-lg font-black text-blue-600 uppercase">{reward.card_name}</p>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                    Current Streak: <span className="text-orange-500">{reward.current_streak} Days</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => { setReward(null); onClose(); }}
                className="w-full py-4 bg-black text-white font-black text-lg rounded-2xl border-4 border-black hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
              >
                Collect Rewards
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
