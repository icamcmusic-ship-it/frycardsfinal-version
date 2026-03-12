import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn, getRarityStyles, getCardBackUrl } from '../lib/utils';
import { audioService } from '../services/AudioService';

const RARITY_GLOW: Record<string, string> = {
  Divine: 'shadow-[0_0_60px_rgba(239,68,68,1)]',
  Mythic: 'shadow-[0_0_40px_rgba(234,179,8,0.9)]',
  'Super-Rare': 'shadow-[0_0_30px_rgba(168,85,247,0.8)]',
  Rare: 'shadow-[0_0_20px_rgba(59,130,246,0.7)]',
};

interface FlipCardProps {
  card: any;
  cardBackUrl: string | null;
  onReveal: () => void;
}

export const FlipCard: React.FC<FlipCardProps> = ({
  card,
  cardBackUrl,
  onReveal,
}) => {
  const [flipped, setFlipped] = useState(false);
  const glowClass = RARITY_GLOW[card.rarity] ?? '';

  const handleClick = () => {
    if (flipped) return;
    audioService.play('click');
    setFlipped(true);
    setTimeout(onReveal, 600); // wait for flip to complete
  };

  return (
    <motion.div
      initial={{ scale: 0, rotateZ: 10 }}
      animate={{ scale: 1, rotateZ: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative w-64 h-[340px] cursor-pointer select-none"
      style={{ perspective: '1000px' }}
      onClick={handleClick}
      onMouseEnter={() => audioService.play('hover')}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 50 && !flipped) {
          handleClick();
        }
      }}
    >
      {/* Rarity-specific effects when flipped */}
      {flipped && (card.rarity === 'Divine' || card.rarity === 'Mythic') && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "absolute inset-0 rounded-xl",
              card.rarity === 'Divine' ? "bg-red-500" : "bg-yellow-400"
            )}
          />
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute w-2 h-2 rounded-full",
                card.rarity === 'Divine' ? "bg-red-500" : "bg-yellow-400"
              )}
              style={{ left: '50%', top: '50%' }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
      {flipped && (card.rarity === 'Super-Rare' || card.rarity === 'Rare') && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute inset-0 rounded-xl",
              card.rarity === 'Super-Rare' ? "bg-purple-500" : "bg-blue-500"
            )}
          />
        </div>
      )}

      <motion.div
        className="relative w-full h-full z-10"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
      >
        {/* BACK FACE */}
        <div
          className="absolute inset-0 rounded-xl border-4 border-[var(--border)] overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <img src={getCardBackUrl(cardBackUrl)} className="w-full h-full object-cover" />
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
    </motion.div>
  );
}
