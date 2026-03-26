import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Gift, Lock, Check, Gem, Coins, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { useProfileStore } from '../stores/profileStore';
import { ConfirmModal } from '../components/ConfirmModal';

const REWARD_ICONS: Record<string, React.ReactNode> = {
  gold:  <Coins className="w-5 h-5 text-yellow-500" />,
  gems:  <Gem className="w-5 h-5 text-emerald-500" />,
  xp:    <Zap className="w-5 h-5 text-blue-500" />,
  pack:  <Gift className="w-5 h-5 text-purple-500" />,
};

export function SeasonPass() {
  const { profile } = useProfileStore();
  const [passData, setPassData] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [claiming, setClaiming] = useState<number | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
    if (claiming) return;
    setClaiming(tier);
    try {
      // claim_season_pass_tier signature: (p_season, p_tier)
      const { error } = await supabase.rpc('claim_season_pass_tier', { p_season: passData?.season || 1, p_tier: tier });
      if (error) throw error;
      
      toast.success(`Claimed Tier ${tier} reward!`);
      
      // Refresh profile to update gold/gems/packs
      await useProfileStore.getState().refreshProfile();
      
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin" /></div>;

  const userLevel = tiers.filter(t => t.xp_required <= (passData?.xp_earned ?? 0)).length;
  const userXP    = passData?.xp_earned ?? 0;
  const claimedTiers: number[] = passData?.claimed_tiers ?? [];
  const isPremium = passData?.is_premium ?? false;

  const nextTier = tiers.find(t => t.tier > userLevel);
  const currentTier = tiers.find(t => t.tier === userLevel);
  const prevXP = currentTier ? currentTier.xp_required : 0;
  const xpToNext = nextTier ? nextTier.xp_required : null;
  const progressPct = xpToNext ? Math.min(100, ((userXP - prevXP) / (xpToNext - prevXP)) * 100) : 100;

  const upgradeToPremium = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Upgrade Season Pass',
      message: 'Upgrade to Premium Season Pass for 500 Gems?',
      variant: 'info',
      onConfirm: async () => {
        try {
          const { data, error } = await supabase.rpc('upgrade_season_pass_premium', { p_cost: 500 });
          if (error) throw error;
          
          if (data && data.success === false) {
            throw new Error(data.error || 'Failed to upgrade');
          }
          
          toast.success('Upgraded to Premium!', { icon: '✨' });
          fetchData();
          
          // Refresh profile to update gems
          await useProfileStore.getState().refreshProfile();
        } catch (err: any) {
          toast.error(err.message || 'Failed to upgrade');
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Season Pass</h1>
        
        {!isPremium && (
          <button onClick={upgradeToPremium}
            className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 transition-colors text-black font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2">
            <Gem className="w-5 h-5 text-emerald-600" />
            Upgrade to Premium — 500 Gems
          </button>
        )}
      </div>

      {/* XP Progress Bar */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-2xl font-black text-[var(--text)]">Level {userLevel}</p>
          <p className="font-mono font-bold text-slate-500">{userXP.toLocaleString()} XP{xpToNext ? ` / ${xpToNext.toLocaleString()}` : ''}</p>
        </div>
        <div className="w-full h-4 bg-[var(--bg)] rounded-full border-2 border-[var(--border)] overflow-hidden">
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
              className={cn("flex justify-between items-center p-5 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[4px_4px_0px_0px_var(--border)]",
                (isLocked || isClaimed) && "opacity-50")}>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-black text-slate-300 w-10 text-center">#{tier.tier}</div>
                <div className="flex items-center gap-2">
                  {REWARD_ICONS[tier.reward_type] ?? <Gift className="w-5 h-5" />}
                  <div>
                    {/* tier.reward_label is the correct column */}
                    <h3 className="font-black text-base uppercase text-[var(--text)]">{tier.reward_label}</h3>
                    <p className="text-xs font-bold text-slate-500">{tier.xp_required.toLocaleString()} XP required</p>
                  </div>
                </div>
              </div>

              {isClaimed ? (
                <div className="p-3 bg-green-400 rounded-xl border-2 border-[var(--border)]"><Check className="w-5 h-5" /></div>
              ) : isLocked ? (
                <div className="p-3 bg-slate-200 rounded-xl border-2 border-[var(--border)]"><Lock className="w-5 h-5 text-slate-400" /></div>
              ) : (
                <button onClick={() => claimTier(tier.tier)}
                  disabled={claiming === tier.tier}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2">
                  {claiming === tier.tier ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Claim!'}
                </button>
              )}
            </div>
          );
        })}

        {tiers.length === 0 && (
          <div className="text-center py-16 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl font-bold text-slate-500">
            No season pass tiers available yet.
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />
    </div>
  );
}
