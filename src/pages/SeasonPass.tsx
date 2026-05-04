import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Gift, Lock, Check, Gem, Coins, Zap, Shirt, Image, User } from 'lucide-react';
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
  card_back: <Shirt className="w-5 h-5 text-indigo-500" />,
  banner: <Image className="w-5 h-5 text-pink-500" />,
  profile_avatar: <User className="w-5 h-5 text-orange-500" />,
};

interface TierCardProps {
  tier: any;
  userLevel: number;
  isPremium: boolean;
  isClaimed: boolean;
  isClaiming: boolean;
  onClaim: (tier: number) => void;
}

const TierCard: React.FC<TierCardProps> = ({ tier, userLevel, isPremium, isClaimed, isClaiming, onClaim }) => {
  const isLocked = tier.tier > userLevel;
  const isPremiumTier = tier.is_premium;
  const canClaim = !isLocked && !isClaimed && (isPremium || !isPremiumTier);

  return (
    <div className={cn(
      "flex justify-between items-center p-5 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[4px_4px_0px_0px_var(--border)] relative overflow-visible transition-all",
      (isLocked || isClaimed) && "opacity-60 grayscale-[0.3]",
      isPremiumTier && !isPremium && "border-yellow-500/50 bg-yellow-50/10"
    )}>
      
      <div className="absolute -top-3 left-4 bg-[var(--border)] text-white font-black text-[10px] px-2 py-0.5 rounded-full z-20">
        Tier {tier.tier}
      </div>
      
      {isPremiumTier && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-black px-2 py-0.5 font-black text-[8px] uppercase rounded-bl-lg border-l-2 border-b-2 border-black z-10 flex items-center gap-1">
          <Gem className="w-2 h-2" />
          Premium
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="text-3xl font-black text-slate-300 w-10 text-center">#{tier.tier}</div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-16 h-16 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_black] overflow-hidden bg-slate-100 shrink-0",
            isPremiumTier ? "bg-yellow-50" : "bg-slate-50"
          )}>
            {tier.preview_image ? (
              <img 
                src={tier.preview_image} 
                className={cn(
                  "w-full h-full",
                  tier.reward_type === 'card_back' ? "object-contain p-1" : "object-cover"
                )}
                alt={tier.preview_name}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {REWARD_ICONS[tier.reward_type] ?? <Gift className="w-6 h-6 text-slate-400" />}
              </div>
            )}
          </div>
          <div>
            {tier.is_exclusive && (
              <span className="text-[8px] font-black text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-400 uppercase mb-1 inline-block">
                ✨ Exclusive
              </span>
            )}
            <h3 className="font-black text-base uppercase text-[var(--text)] line-clamp-1">
              {tier.preview_name || tier.reward_label}
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {isLocked ? `Unlock at Level ${tier.tier}` : isClaimed ? 'Claimed' : 'Ready to claim!'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        {isClaimed ? (
          <div className="p-3 bg-green-400 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <Check className="w-5 h-5 text-white" />
          </div>
        ) : isLocked ? (
          <div className="p-3 bg-slate-100 rounded-xl border-4 border-slate-200">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
        ) : isPremiumTier && !isPremium ? (
          <div className="flex flex-col items-center gap-1">
            <div className="p-3 bg-yellow-100 rounded-xl border-4 border-yellow-300">
              <Lock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-[8px] font-black uppercase text-yellow-600">Premium</span>
          </div>
        ) : (
          <button 
            onClick={() => onClaim(tier.tier)}
            disabled={isClaiming}
            className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_black] flex items-center justify-center gap-2"
          >
            {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Claim!'}
          </button>
        )}
      </div>
    </div>
  );
}

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
      supabase.rpc('get_or_create_season_pass', { p_season: 1 }),
      supabase.rpc('get_season_pass_with_previews', { p_season: 1 }),
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
          <p className="font-mono font-bold text-slate-500">
            {xpToNext 
              ? `${(userXP - prevXP).toLocaleString()} / ${(xpToNext - prevXP).toLocaleString()} XP` 
              : 'MAX LEVEL'}
            {xpToNext && <span className="ml-2 text-xs font-bold text-slate-400">({Math.round(progressPct)}%)</span>}
          </p>
        </div>
        <div className="w-full h-4 bg-[var(--bg)] rounded-full border-2 border-[var(--border)] overflow-hidden">
          <motion.div className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>

      <div className="grid gap-3">
        {tiers.map(tier => (
          <TierCard 
            key={tier.id || tier.tier}
            tier={tier}
            userLevel={userLevel}
            isPremium={isPremium}
            isClaimed={claimedTiers.includes(tier.tier)}
            isClaiming={claiming === tier.tier}
            onClaim={claimTier}
          />
        ))}

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
