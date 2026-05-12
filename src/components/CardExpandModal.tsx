// src/components/CardExpandModal.tsx
// Full-screen card detail modal — shows complete stats, keyword with tier explainer,
// flavor text, set info, serial numbers, and collection actions.

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Zap, Lock, Unlock, Star, Coins, Info, BookOpen, Sword, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useKeywordStore } from '../stores/keywordStore';

// ── Keyword explanations (mirrors keyword_definitions table, front-end cache) ──
const KEYWORD_EXPLAINERS: Record<string, { grade: string; tiers: string[]; avoid: string }> = {
  Vanguard:   { grade: 'B', tiers: ['Peek top of TCG deck at Pre-Flop start.', 'Your first Cast each hand costs 10 fewer chips.', 'May use Face-Up Hole Cards to execute Assassinations.'], avoid: 'Reckless Units — conflicts with methodical early game.' },
  Fuel:       { grade: 'B', tiers: ['Discard a card, win with High Card, or Assassinate with Ace to charge.', 'See Leader card for charge condition.', 'See Leader card for charge condition.'], avoid: 'Faustian Events — shrinks economy for Fuel costs.' },
  Ignite:     { grade: 'A', tiers: ['Instantly destroy all enemy Units on activation.', 'Your Units gain +3 Defense while Leader is Ignited.', 'Triggers a permanent powerful Aura effect.'], avoid: 'Fold-Cast strategies — cannot afford Fold while awaiting Ignite.' },
  Ultimatum:  { grade: 'S', tiers: ['Opponent pays 100 chips OR sacrifices a Unit.', 'Opponent Locks 1 Seat next hand OR reveals Hole Cards.', 'Opponent surrenders 50% of Stash OR permanently Locks two Seats.'], avoid: 'High Stakes Locations — opponent may be too broke to punish.' },
  Martyr:     { grade: 'S', tiers: ['Look at Flop cards before betting each hand.', 'Tax: Pay 50 chips to pot each hand or Leader dies.', 'Tax: Pay 50 chips to pot each hand or Leader dies.', 'Tax: Pay 50 chips to pot each hand or Leader dies.'], avoid: 'All-In Events — 0-chip All-In triggers immediate Martyr death.' },
  Desperado:  { grade: 'C', tiers: ['May declare Fold AFTER Showdown cards are revealed.', 'See card text for additional condition.', 'See card text for additional condition.'], avoid: 'Jackpot Locations — actively forfeiting the Pot nullifies the bonus.' },
  Grifter:    { grade: 'A', tiers: ['Steal 10 chips from opponent\'s Stash.', 'Steal 25 chips and draw 1 TCG card.', 'Steal 50 chips from Stash and draw 1 TCG card.'], avoid: 'Reckless Units — Grifter needs free seats for replaying.' },
  Enforcer:   { grade: 'B', tiers: ['Opponents must Assassinate this Unit before targeting others.', 'Opponents cannot play Events targeting your Leader until this dies.', 'Opponents cannot play Events targeting your Casino Floor until this dies.'], avoid: 'Ghost Units — cannot be both untargetable and Taunt simultaneously.' },
  Undercover: { grade: 'C', tiers: ['Pay 10 chips to flip; deal 20 damage to opponent\'s Stash.', 'Flips automatically when targeted, negating that Assassination.', 'Flips at Showdown, upgrading your Poker Hand ranking by one tier.'], avoid: 'Soulbound Artifacts — Undercover Units cannot hold Artifacts while Face-Down.' },
  'High Roller': { grade: 'B', tiers: ['While you have more chips: this Unit gains +2 Defense.', 'While you have more chips: Pre-Flop Casts cost 0 chips.', 'While you have more chips: this Unit cannot be Assassinated.'], avoid: 'Martyr Leaders — constant chip drain makes maintaining advantage hard.' },
  Reckless:   { grade: 'S', tiers: ['12 Defense. Drawback: play with 1 Hole Card face-up.', '14 Defense, unkillable. Drawback: one Seat permanently Locked.', 'Copy every Event you cast for free. Drawback: cannot Bet or Raise.'], avoid: 'Faustian Events — stacking drawbacks (Locked seats + Fatigue) will paralyze you.' },
  Mercenary:  { grade: 'C', tiers: ['If opponent\'s Stash is double yours, this Unit switches to their board.', 'Start of Pre-Flop: player who Antes most extra chips gains control.', 'See card text for Tier III condition.'], avoid: 'All-In — dropping to 0 chips guarantees instant betrayal.' },
  Syndicate:  { grade: 'A', tiers: ['Each friendly Syndicate Unit grants +1 to your Poker Hand ranking.', 'Each friendly Syndicate Unit grants +2 to your Poker Hand ranking.', 'Syndicate Units cannot be Assassinated while 2+ others are in play.'], avoid: 'Slow decks — Syndicate is all-in on board flooding speed.' },
  Extort:     { grade: 'B', tiers: ['Opponent pays 10 extra chips to Call or Raise.', 'Opponent pays 10 chips to Check.', 'Opponent pays 20 chips whenever they cast a TCG card.'], avoid: 'Fold-Cast strategies — Extort punishes opponent bets, not your folds.' },
  Tell:       { grade: 'C', tiers: ['Once per hand, peek at 1 random card in opponent\'s hand.', 'Peek at opponent\'s Hole Cards at start of each phase.', 'Opponents must play with 1 Hole Card permanently face-up.'], avoid: 'Bluff-heavy Leaders — information matters less if you plan to bluff anyway.' },
  Ghost:      { grade: 'A', tiers: ['This Unit cannot be targeted by opponent\'s Event cards.', 'This Unit cannot be Assassinated by opponent.', 'This Unit is completely invisible — opponent cannot see it until it acts.'], avoid: 'Enforcer Units — cannot be both Taunt and Ghost simultaneously.' },
  Sabotage:   { grade: 'B', tiers: ['Opponent\'s next Cast costs 20 more chips.', 'Lock one of opponent\'s Seats for 1 hand.', 'Opponent discards their entire hand at start of next Pre-Flop.'], avoid: 'Passive decks — Sabotage requires active casting to be effective.' },
  Faustian:   { grade: 'A', tiers: ['Massive immediate effect. Drawback: discard 2 cards from hand.', 'Massive immediate effect. Drawback: skip your next Cast phase.', 'Massive immediate effect. Drawback: permanently reduce max hand size by 2.'], avoid: 'Reckless Units — stacking Locked Seats + hand reduction is paralyzing.' },
  'All-In':   { grade: 'S', tiers: ['Go to 0 chips; survive until Showdown; cast 0-cost cards only.', 'Go to 0 chips; if you win Showdown, gain triple the pot.', 'See card text for Tier III condition.'], avoid: 'Martyr Leaders — 0 chips = instant Martyr death at next Pre-Flop.' },
  Jackpot:    { grade: 'B', tiers: ['10% bonus chips added to Pot each hand while at this Location.', '20% bonus chips added to Pot each hand.', '50% bonus chips to Pot; losing player also loses a Unit.'], avoid: 'Desperado Leaders — Jackpot rewards staying in; Desperado plans to Fold.' },
  'High Stakes': { grade: 'A', tiers: ['Blinds are doubled for the duration of this Location.', 'Blinds are tripled; minimum bet equals Big Blind.', 'Blinds are quadrupled; check actions are banned.'], avoid: 'Low-stash strategies — high blinds drain chip-poor players fast.' },
  Haunted:    { grade: 'C', tiers: ['Random Unit on each board gains -2 Defense each hand.', 'One random Unit per board is Silenced each hand.', 'The Unit with lowest Defense on each board is destroyed each hand.'], avoid: 'Reckless Units — your unkillable unit is wasted in a Haunted venue.' },
  'Poker Night': { grade: 'B', tiers: ['All players draw 1 extra Hole Card per hand.', 'All players draw 2 extra Hole Cards; show one to opponents.', 'Players may swap one Hole Card with any community card each hand.'], avoid: 'Tell Leaders — extra cards don\'t help if opponent sees your hand anyway.' },
};

const RARITY_CONFIG: Record<string, { border: string; bg: string; badge: string; glow: string; label: string }> = {
  Common:       { border: 'border-slate-400',  bg: 'from-slate-900 to-slate-800',   badge: 'bg-slate-600 text-slate-100',    glow: '',                                         label: 'Common' },
  Uncommon:     { border: 'border-green-500',  bg: 'from-green-950 to-slate-900',   badge: 'bg-green-700 text-green-100',    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',   label: 'Uncommon' },
  Rare:         { border: 'border-blue-500',   bg: 'from-blue-950 to-slate-900',    badge: 'bg-blue-700 text-blue-100',      glow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)]',  label: 'Rare' },
  'Super-Rare': { border: 'border-purple-500', bg: 'from-purple-950 to-slate-900',  badge: 'bg-purple-700 text-purple-100',  glow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]',  label: 'Super Rare' },
  Mythic:       { border: 'border-yellow-400', bg: 'from-yellow-950 to-amber-950',  badge: 'bg-yellow-600 text-yellow-100',  glow: 'shadow-[0_0_35px_rgba(234,179,8,0.6)]',   label: 'Mythic' },
  Divine:       { border: 'border-red-500',    bg: 'from-red-950 to-orange-950',    badge: 'bg-red-700 text-red-100',        glow: 'shadow-[0_0_40px_rgba(239,68,68,0.7)]',   label: 'Divine' },
};

const TIER_LABELS = ['', 'I', 'II', 'III'];
const TIER_COLORS = ['', 'text-slate-300', 'text-blue-300', 'text-amber-300'];

interface CardExpandModalProps {
  card: any | null;
  onClose: () => void;
  onToggleLock?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
}

export function CardExpandModal({ card, onClose, onToggleLock, onToggleWishlist, isWishlisted }: CardExpandModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { fetchDefinitions, getDefinition } = useKeywordStore();

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!card) return null;

  const rarity = card.rarity || 'Common';
  const rc = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.Common;
  const kwNameRaw = card.keyword as string | undefined;
  // Normalize keyword lookup for case-insensitivity and minor character differences
  const kwName = kwNameRaw ? (Object.keys(KEYWORD_EXPLAINERS).find(k => k.toLowerCase() === kwNameRaw.toLowerCase()) || kwNameRaw) : undefined;
  
  const kwTier = card.keyword_tier as number | undefined;
  const kwInfo = kwName ? KEYWORD_EXPLAINERS[kwName] : null;
  const tierLabel = kwTier ? TIER_LABELS[kwTier] : null;

  // DB-driven definition for the specific card tier
  const dbDef = (kwNameRaw && kwTier) ? getDefinition(kwNameRaw, kwTier) : undefined;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className={cn(
            'relative z-10 w-full max-w-3xl rounded-2xl border-4 overflow-hidden',
            'bg-gradient-to-br', rc.bg, rc.border, rc.glow
          )}
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row gap-0">
            {/* ── LEFT: Card image ── */}
            <div className="flex-shrink-0 md:w-64 lg:w-72">
              <div className="relative aspect-[2/3] md:h-full w-full overflow-hidden">
                {card.is_video ? (
                  <video src={card.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                )}
                {/* Foil shimmer */}
                {card.is_foil && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
                )}
                {/* Rarity badge overlay */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', rc.badge)}>
                      {rc.label}
                    </span>
                    {card.is_foil && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-pink-500 text-white">
                        ✦ FOIL
                      </span>
                    )}
                  </div>
                  {card.serial_number && (
                    <p className="text-[10px] text-white/50 font-mono mt-1">#{card.serial_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Details ── */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[80vh] flex flex-col gap-4">
              {/* Name & type */}
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{card.name}</h2>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                  {card.card_type} {card.set_name ? `· ${card.set_name}` : ''}
                </p>
              </div>

              {/* Stats row */}
              {(card.cast_cost !== undefined || card.defense) && (
                <div className="flex gap-3">
                  {card.cast_cost !== undefined && (
                    <div className="flex items-center gap-1.5 bg-black/40 border border-yellow-600/40 rounded-xl px-3 py-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <div>
                        <p className="text-[9px] text-yellow-500/70 font-black uppercase">Cost</p>
                        <p className="text-lg font-black text-yellow-300 leading-none">{card.cast_cost}</p>
                      </div>
                    </div>
                  )}
                  {card.defense && (
                    <div className="flex items-center gap-1.5 bg-black/40 border border-blue-600/40 rounded-xl px-3 py-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-[9px] text-blue-500/70 font-black uppercase">Defense</p>
                        <p className="text-lg font-black text-blue-300 leading-none">{card.defense}</p>
                      </div>
                    </div>
                  )}
                  {card.power_grade && (
                    <div className="flex items-center gap-1.5 bg-black/40 border border-emerald-600/40 rounded-xl px-3 py-2">
                      <Star className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-[9px] text-emerald-500/70 font-black uppercase">Grade</p>
                        <p className="text-lg font-black text-emerald-300 leading-none">{card.power_grade}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Always show effect text if present */}
              {card.effect_text && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 shadow-inner">
                  <p className="text-sm text-amber-100/90 leading-relaxed font-bold italic">
                    <span className="text-amber-500 uppercase text-[10px] not-italic mr-2 tracking-widest font-black">Ability:</span>
                    {card.effect_text}
                  </p>
                </div>
              )}

              {/* Keyword ability explainer */}
              {kwName && (
                <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                    <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="font-black text-white uppercase tracking-tight">{kwName}</span>
                    {tierLabel && (
                      <span className={cn('text-xs font-black px-2 py-0.5 rounded-full bg-white/10', TIER_COLORS[kwTier!])}>
                        Tier {tierLabel}
                        {kwInfo?.grade && (
                          <span className="ml-1 opacity-70">· Grade {kwInfo.grade}</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Tier-by-tier explanation */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Keyword Codex
                    </p>
                    
                    {/* If we have a DB definition for THIS tier, highlight it specially */}
                    {dbDef && (
                      <div className="bg-amber-500/20 border-2 border-amber-500/40 rounded-xl p-3 mb-2">
                        <p className="text-amber-200 text-xs font-bold leading-relaxed">{dbDef.rules_text}</p>
                      </div>
                    )}

                    {/* Standard fallback levels */}
                    {kwInfo && kwInfo.tiers.map((desc, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-2 rounded-lg px-3 py-1.5 text-[11px]',
                          kwTier === i + 1
                            ? 'bg-amber-500/10 border border-amber-500/20 hidden' // Hide if we already showed dbDef above
                            : 'bg-white/5 border border-white/5 opacity-40'
                        )}
                      >
                        <span className={cn('font-black flex-shrink-0 mt-0.5', TIER_COLORS[i + 1])}>
                          {TIER_LABELS[i + 1]}
                        </span>
                        <p className="text-white/60 leading-snug">{desc}</p>
                      </div>
                    ))}

                    {kwInfo && (
                      <div className="rounded-lg px-3 py-2 bg-red-950/20 border border-red-800/20 text-[10px]">
                        <p className="text-red-400 font-black text-[8px] uppercase tracking-widest mb-0.5">⚠ Anti-Synergy</p>
                        <p className="text-red-300/40">{kwInfo.avoid}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flavor text */}
              {card.flavor_text && (
                <p className="text-sm text-white/40 italic border-l-2 border-white/10 pl-3 leading-relaxed">
                  "{card.flavor_text}"
                </p>
              )}

              {/* Collection info */}
              {(card.quantity !== undefined || card.foil_quantity !== undefined) && (
                <div className="flex gap-2 flex-wrap">
                  {card.quantity > 0 && (
                    <div className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full text-white/60">
                      ×{card.quantity} in collection
                    </div>
                  )}
                  {card.foil_quantity > 0 && (
                    <div className="text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-pink-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-full text-yellow-300">
                      ✦ ×{card.foil_quantity} foil
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2">
                {onToggleLock && (
                  <button
                    onClick={onToggleLock}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all',
                      card.is_locked
                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-white/10 border border-white/20 text-white/60 hover:bg-white/20'
                    )}
                  >
                    {card.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {card.is_locked ? 'Locked' : 'Lock'}
                  </button>
                )}
                {onToggleWishlist && (
                  <button
                    onClick={onToggleWishlist}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all',
                      isWishlisted
                        ? 'bg-pink-500/20 border border-pink-500/50 text-pink-300 hover:bg-pink-500/30'
                        : 'bg-white/10 border border-white/20 text-white/60 hover:bg-white/20'
                    )}
                  >
                    <Star className="w-3 h-3" />
                    {isWishlisted ? 'Wishlisted' : 'Wishlist'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
