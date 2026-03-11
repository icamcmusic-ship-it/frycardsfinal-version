import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';

const RARITY_GLOW: Record<string, string> = {
  Divine: 'shadow-[0_0_60px_rgba(239,68,68,1)]',
  Mythic: 'shadow-[0_0_40px_rgba(234,179,8,0.9)]',
  'Super-Rare': 'shadow-[0_0_30px_rgba(168,85,247,0.8)]',
  Rare: 'shadow-[0_0_20px_rgba(59,130,246,0.7)]',
};

export function FlipCard({
  card,
  cardBackUrl,
  onReveal,
}: {
  card: any;
  cardBackUrl: string | null;
  onReveal: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const glowClass = RARITY_GLOW[card.rarity] ?? '';

  const handleClick = () => {
    if (flipped) return;
    setFlipped(true);
    setTimeout(onReveal, 600); // wait for flip to complete
  };

  return (
    <div
      className="relative w-44 h-64 cursor-pointer select-none"
      style={{ perspective: '1000px' }}
      onClick={handleClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
      >
        {/* BACK FACE */}
        <div
          className="absolute inset-0 rounded-xl border-4 border-[var(--border)] overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {cardBackUrl ? (
            <img src={cardBackUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 flex items-center justify-center">
              <span className="text-7xl font-black text-white/20 select-none">F</span>
            </div>
          )}
          {/* Tap hint */}
          {!flipped && (
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-white text-xs font-black uppercase tracking-widest"
              >
                Tap to reveal
              </motion.p>
            </div>
          )}
        </div>

        {/* FRONT FACE */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl border-4 border-[var(--border)] overflow-hidden',
            glowClass
          )}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {card.is_video ? (
            <video src={card.image_url} autoPlay muted loop className="w-full h-full object-cover" />
          ) : (
            <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
          )}
          {card.is_foil && (
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none" />
          )}
          <div className="absolute top-2 right-2 z-20">
            <span className={cn(
              'text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]',
              getRarityStyles(card.rarity, card.is_foil)
            )}>
              {card.is_foil ? '✨ Foil' : card.rarity}
            </span>
          </div>
          {card.is_new && (
            <div className="absolute top-2 left-2 z-20 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md border-2 border-black animate-bounce">
              NEW!
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-2 px-2 z-10">
            <p className="text-white font-black text-[10px] uppercase tracking-widest truncate">{card.name}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
