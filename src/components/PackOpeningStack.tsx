import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { X, ChevronDown, Sparkles, Trophy } from 'lucide-react';

const RARITY_ORDER: Record<string, number> = {
  Common: 0, Uncommon: 1, Rare: 2, 'Super-Rare': 3, Mythic: 4, Divine: 5,
};
const RARITY_GLOW: Record<string, string> = {
  Common:       'shadow-none',
  Uncommon:     'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
  Rare:         'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
  'Super-Rare': 'shadow-[0_0_30px_rgba(168,85,247,0.6)]',
  Mythic:       'shadow-[0_0_40px_rgba(234,179,8,0.7)]',
  Divine:       'shadow-[0_0_50px_rgba(239,68,68,0.8)]',
};
const RARITY_BORDER: Record<string, string> = {
  Common:       'border-slate-500',
  Uncommon:     'border-green-500',
  Rare:         'border-blue-500',
  'Super-Rare': 'border-purple-500',
  Mythic:       'border-yellow-400',
  Divine:       'border-red-500',
};

interface PackCard {
  id?: string;
  name: string;
  rarity: string;
  image_url: string;
  is_foil?: boolean;
  is_video?: boolean;
  keyword?: string;
  keyword_tier?: number;
  is_new?: boolean;
  cast_cost?: number;
  defense?: number;
  effect_text?: string;
  [key: string]: any;
}

interface PackOpeningStackProps {
  cards: PackCard[];
  summary?: {
    xp_gained?: number;
    new_card_count?: number;
    pack_points_earned?: number;
  } | null;
  onClose: () => void;
}

const TIER_ROMAN = ['', 'I', 'II', 'III'];

export function PackOpeningStack({ cards, summary, onClose }: PackOpeningStackProps) {
  // Sort: worst rarity on top (index 0), best rarity at bottom (last index)
  // When we "remove the top card", we're revealing the next card underneath.
  const sorted = useMemo(() => {
    // Chase card (best) goes to bottom (last in array = bottom of visual stack)
    return [...cards].sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0));
  }, [cards]);

  // Stack state: remaining cards (top = index 0 visually = last in array)
  const [remaining, setRemaining] = useState(sorted);
  const [revealed, setRevealed] = useState<PackCard[]>([]);
  const [flyingCard, setFlyingCard] = useState<PackCard | null>(null);
  const [allDone, setAllDone] = useState(false);

  const topCard = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  const isBestCard = topCard && topCard === sorted[sorted.length - 1];

  const removeTop = useCallback(() => {
    if (remaining.length === 0 || flyingCard) return;
    const top = remaining[remaining.length - 1];
    setFlyingCard(top);
    setTimeout(() => {
      setRemaining(prev => prev.slice(0, -1));
      setRevealed(prev => [...prev, top]);
      setFlyingCard(null);
      if (remaining.length === 1) {
        setAllDone(true);
      }
    }, 350);
  }, [remaining, flyingCard]);

  const topRarity = topCard?.rarity ?? 'Common';

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <div>
          <p className="text-white font-black uppercase tracking-widest text-sm">
            {allDone ? 'All Cards Revealed!' : `${remaining.length} card${remaining.length !== 1 ? 's' : ''} remaining`}
          </p>
          {!allDone && remaining.length > 1 && (
            <p className="text-gray-500 text-xs font-bold">
              {isBestCard ? '✨ Chase card!' : 'Click to reveal next card'}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main stack area */}
      <div className="flex flex-col items-center gap-8 w-full max-w-sm px-6">
        {!allDone ? (
          <div className="relative flex flex-col items-center" onClick={removeTop}>
            {/* Stack shadow cards (depth effect) */}
            {remaining.length > 2 && (
              <div
                className="absolute inset-0 rounded-2xl border-4 border-gray-700 bg-gray-800"
                style={{ transform: 'translate(8px, 8px) rotate(3deg)' }}
              />
            )}
            {remaining.length > 1 && (
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl border-4 bg-gray-800",
                  RARITY_BORDER[remaining[remaining.length - 2]?.rarity ?? 'Common'] + '/50'
                )}
                style={{ transform: 'translate(4px, 4px) rotate(1.5deg)' }}
              />
            )}

            {/* Top card */}
            <AnimatePresence>
              {topCard && !flyingCard && (
                <motion.div
                  key={topCard.name + remaining.length}
                  initial={{ scale: 0.95, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ x: 300, y: -100, rotate: 20, opacity: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className={cn(
                    "relative w-64 aspect-[2/3] rounded-2xl border-4 overflow-hidden cursor-pointer",
                    "hover:scale-[1.02] transition-transform",
                    RARITY_BORDER[topRarity],
                    RARITY_GLOW[topRarity]
                  )}
                >
                  {/* Card image */}
                  {topCard.is_video ? (
                    <video src={topCard.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={topCard.image_url} alt={topCard.name} className="w-full h-full object-cover" />
                  )}

                  {/* Foil shimmer */}
                  {topCard.is_foil && (
                    <div className="absolute inset-0 foil-shine pointer-events-none" />
                  )}

                  {/* Info overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                        topRarity === 'Divine' ? 'bg-red-600 text-white' :
                        topRarity === 'Mythic' ? 'bg-yellow-500 text-black' :
                        topRarity === 'Super-Rare' ? 'bg-purple-600 text-white' :
                        topRarity === 'Rare' ? 'bg-blue-600 text-white' :
                        topRarity === 'Uncommon' ? 'bg-green-600 text-white' :
                        'bg-gray-600 text-white'
                      )}>
                        {topCard.is_foil ? '✦ ' : ''}{topRarity}
                      </span>
                      {topCard.is_new && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400 text-black">NEW</span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-base uppercase leading-tight">{topCard.name}</h3>
                    {topCard.keyword && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-900/50 px-1.5 py-0.5 rounded">
                          ⚡ {topCard.keyword}{topCard.keyword_tier ? ` ${TIER_ROMAN[topCard.keyword_tier]}` : ''}
                        </span>
                      </div>
                    )}
                    {topCard.effect_text && (
                      <p className="text-[10px] text-white/60 mt-1 line-clamp-2 italic">{topCard.effect_text}</p>
                    )}
                  </div>

                  {/* Chase/special indicators */}
                  {remaining.length === 1 && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Chase Card
                      </span>
                    </div>
                  )}

                  {/* Tap to reveal hint */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/70 rounded-full px-4 py-2 border border-white/20">
                      <p className="text-white font-black text-xs uppercase">Tap to flip</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Count badge */}
            <div className="absolute -top-3 -right-3 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-black text-sm border-2 border-black shadow-lg z-10">
              {remaining.length}
            </div>
          </div>

        ) : (
          /* All done screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase mb-2">Pack Opened!</h2>
            {summary && (
              <div className="flex gap-3 justify-center flex-wrap text-sm font-bold mb-6">
                {summary.xp_gained && (
                  <span className="bg-emerald-900/40 border border-emerald-700 text-emerald-300 px-3 py-1 rounded-full">
                    +{summary.xp_gained} XP
                  </span>
                )}
                {summary.new_card_count && summary.new_card_count > 0 && (
                  <span className="bg-blue-900/40 border border-blue-700 text-blue-300 px-3 py-1 rounded-full">
                    {summary.new_card_count} New
                  </span>
                )}
                {summary.pack_points_earned && summary.pack_points_earned > 0 && (
                  <span className="bg-indigo-900/40 border border-indigo-700 text-indigo-300 px-3 py-1 rounded-full">
                    +{summary.pack_points_earned} Spark
                  </span>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase rounded-xl tracking-widest transition-all"
            >
              Done
            </button>
          </motion.div>
        )}

        {/* Revealed cards mini-row */}
        {revealed.length > 0 && !allDone && (
          <div className="w-full">
            <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Revealed ({revealed.length})</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {revealed.map((card, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 w-12 aspect-[2/3] rounded border-2 overflow-hidden",
                    RARITY_BORDER[card.rarity]
                  )}
                >
                  <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All revealed grid */}
        {allDone && (
          <div className="w-full max-w-lg">
            <p className="text-[9px] font-black uppercase text-gray-500 mb-3">All {cards.length} Cards</p>
            <div className="grid grid-cols-5 gap-2">
              {[...revealed].reverse().map((card, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-[2/3] rounded-lg border-2 overflow-hidden relative",
                    RARITY_BORDER[card.rarity],
                    RARITY_GLOW[card.rarity]
                  )}
                  title={card.name}
                >
                  <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  {card.is_foil && (
                    <div className="absolute top-0 right-0 text-[6px] bg-amber-400 text-black font-black px-0.5 rounded-bl">✦</div>
                  )}
                  {card.is_new && (
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {!allDone && remaining.length > 0 && (
        <div className="absolute bottom-6 flex flex-col items-center gap-1">
          <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </motion.div>
          <p className="text-[10px] text-gray-600 font-bold uppercase">
            {remaining.length > 1 ? `${cards.length - remaining.length}/${cards.length} revealed — best card at the bottom` : 'Last card!'}
          </p>
        </div>
      )}
    </div>
  );
}
