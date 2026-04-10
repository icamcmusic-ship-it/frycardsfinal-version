import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getCardBackUrl } from '../lib/utils';
import { audioService } from '../services/AudioService';
import { CollectionCard } from './CollectionCard';

const RARITY_GLOW: Record<string, string> = {
  Divine: 'shadow-[0_0_60px_rgba(239,68,68,1)]',
  Mythic: 'shadow-[0_0_40px_rgba(234,179,8,0.9)]',
  'Super-Rare': 'shadow-[0_0_30px_rgba(168,85,247,0.8)]',
  Rare: 'shadow-[0_0_20px_rgba(59,130,246,0.7)]',
};

const RARITY_COLORS: Record<string, string> = {
  Divine: '#ef4444',
  Mythic: '#eab308',
  'Super-Rare': '#a855f7',
  Rare: '#3b82f6',
  Uncommon: '#22c55e',
  Common: '#94a3b8',
};

interface FlipCardProps {
  card: any;
  cardBackUrl: string | null;
  onReveal: () => void;
  isFlipped?: boolean;
  onSelect?: () => void;
}

export const FlipCard: React.FC<FlipCardProps> = ({
  card,
  cardBackUrl,
  onReveal,
  isFlipped,
  onSelect,
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = isFlipped !== undefined ? isFlipped : internalFlipped;
  const glowClass = RARITY_GLOW[card.rarity] ?? '';
  
  const randomRotation = useMemo(() => (Math.random() - 0.5) * 15, []);

  const getRaritySound = (rarity: string) => {
    if (rarity === 'Divine') return 'divine_reveal';
    if (rarity === 'Mythic') return 'mythic_reveal';
    if (['Rare', 'Super-Rare'].includes(rarity)) return 'rare_reveal';
    return 'card_reveal';
  };

  const handleClick = () => {
    if (flipped) {
      if (onSelect) onSelect();
      return;
    }
    audioService.play('click');
    setInternalFlipped(true);
    audioService.play(getRaritySound(card.rarity));
    setTimeout(onReveal, 800);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
          >
            <div 
              className="w-64 h-64 rounded-full blur-3xl opacity-40"
              style={{ backgroundColor: RARITY_COLORS[card.rarity] }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0, rotateZ: randomRotation, y: 100 }}
        animate={{ scale: 1, rotateZ: 0, y: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 260, 
          damping: 20,
          delay: 0.1
        }}
        className="relative cursor-pointer select-none w-full h-full"
        style={{ perspective: '1200px' }}
        onClick={handleClick}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* BACK FACE */}
          <div
            className="absolute inset-0 rounded-xl border-4 border-black overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <img src={getCardBackUrl(cardBackUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            {!flipped && (
              <div className="absolute inset-0 flex items-end justify-center pb-8 bg-gradient-to-t from-black/60 to-transparent">
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                >
                  Tap to reveal
                </motion.p>
              </div>
            )}
          </div>

          {/* FRONT FACE - CollectionCard */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl overflow-hidden',
              glowClass
            )}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <CollectionCard
              card={card}
              className="w-full h-full"
              hideActions={true}
              onSelect={onSelect}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

