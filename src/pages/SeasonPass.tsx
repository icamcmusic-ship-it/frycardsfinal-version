import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Gift, Lock, Check, Gem, Coins, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const REWARD_ICONS: Record<string, React.ReactNode> = {
  gold:  <Coins className="w-5 h-5 text-yellow-500" />,
  gems:  <Gem className="w-5 h-5 text-emerald-500" />,
  xp:    <Zap className="w-5 h-5 text-blue-500" />,
  pack:  <Gift className="w-5 h-5 text-purple-500" />,
};

export function SeasonPass() {
  const [passData, setPassData] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [passRes, tiersRes] = await Promise.all([
      supabase.rpc('get_or_create_season_pass'),
      // ORDER BY tier (not tier_level — that column doesn't exist)
      supabase.from('season_pass_tiers').select('*').order('tier'),
    ]);
    setPassData(passRes.data);
    setTiers(tiersRes.data || []);
    setLoading(false);
  };

  const claimTier = async (tier: number) => {
    // claim_season_pass_tier signature: (p_season, p_tier)
    const { error } = await supabase.rpc('claim_season_pass_tier', { p_season: 1, p_tier: tier });
    if (error) { alert(error.message); return; }
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin" /></div>;

  const userLevel = passData?.current_level ?? 0;
  const userXP    = passData?.xp_earned ?? 0;
  const claimedTiers: number[] = passData?.claimed_tiers ?? [];

  const nextTier = tiers.find(t => t.tier > userLevel);
  const xpToNext = nextTier ? nextTier.xp_required : null;
  const progressPct = xpToNext ? Math.min(100, (userXP / xpToNext) * 100) : 100;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Season Pass</h1>

      {/* XP Progress Bar */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-2xl font-black">Level {userLevel}</p>
          <p className="font-mono font-bold text-slate-500">{userXP.toLocaleString()} XP{xpToNext ? ` / ${xpToNext.toLocaleString()}` : ''}</p>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full border-2 border-black overflow-hidden">
          <motion.div className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>

      <div className="grid gap-3">
        {tiers.map(tier => {
          const isLocked   = tier.tier > userLevel;
          const isClaimed  = claimedTiers.includes(tier.tier);
          const canClaim   = !isLocked && !isClaimed;

          return (
            <div key={tier.id}
              className={cn("flex justify-between items-center p-5 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                isLocked && "opacity-50")}>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-black text-slate-300 w-10 text-center">#{tier.tier}</div>
                <div className="flex items-center gap-2">
                  {REWARD_ICONS[tier.reward_type] ?? <Gift className="w-5 h-5" />}
                  <div>
                    {/* tier.reward_label is the correct column */}
                    <h3 className="font-black text-base uppercase">{tier.reward_label}</h3>
                    <p className="text-xs font-bold text-slate-500">{tier.xp_required.toLocaleString()} XP required</p>
                  </div>
                </div>
              </div>

              {isClaimed ? (
                <div className="p-3 bg-green-400 rounded-xl border-2 border-black"><Check className="w-5 h-5" /></div>
              ) : isLocked ? (
                <div className="p-3 bg-gray-200 rounded-xl border-2 border-black"><Lock className="w-5 h-5 text-slate-400" /></div>
              ) : (
                <button onClick={() => claimTier(tier.tier)}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  Claim!
                </button>
              )}
            </div>
          );
        })}

        {tiers.length === 0 && (
          <div className="text-center py-16 bg-white border-4 border-black rounded-2xl font-bold text-slate-500">
            No season pass tiers available yet.
          </div>
        )}
      </div>
    </div>
  );
}
