import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Gift, Lock, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function SeasonPass() {
  const [passData, setPassData] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [passRes, tiersRes] = await Promise.all([
      supabase.rpc('get_or_create_season_pass'),
      supabase.from('season_pass_tiers').select('*').order('tier_level')
    ]);
    setPassData(passRes.data);
    setTiers(tiersRes.data || []);
    setLoading(false);
  };

  const claimTier = async (tier: number) => {
    await supabase.rpc('claim_season_pass_tier', { p_tier: tier });
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  const userLevel = passData?.current_level || 0;
  const claimedTiers = passData?.claimed_tiers || [];

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Season Pass</h1>
      
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-2xl font-black">Current Level: {userLevel}</p>
      </div>

      <div className="grid gap-4">
        {tiers.map(tier => {
          const isLocked = tier.tier_level > userLevel;
          const isClaimed = claimedTiers.includes(tier.tier_level);
          const canClaim = !isLocked && !isClaimed;

          return (
            <div key={tier.id} className={cn("flex justify-between items-center p-6 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", isLocked && "opacity-50")}>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-slate-400">#{tier.tier_level}</div>
                <div>
                  <h3 className="font-black text-lg uppercase">{tier.reward_name}</h3>
                  <p className="text-sm font-bold text-slate-500">{tier.reward_description}</p>
                </div>
              </div>
              
              {isClaimed ? (
                <div className="p-3 bg-green-400 rounded-xl border-2 border-black"><Check /></div>
              ) : isLocked ? (
                <div className="p-3 bg-slate-200 rounded-xl border-2 border-black"><Lock /></div>
              ) : (
                <button onClick={() => claimTier(tier.tier_level)} className="px-6 py-3 bg-blue-500 text-white font-black rounded-xl border-4 border-black">
                  <Gift className="w-5 h-5 inline mr-2" /> Claim
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
