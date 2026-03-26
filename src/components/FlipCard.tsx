import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getRarityStyles, getCardBackUrl } from '../lib/utils';
import { audioService } from '../services/AudioService';
import { Heart, Sword, Shield, Sparkles } from 'lucide-react';

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
}

export const FlipCard: React.FC<FlipCardProps> = ({
  card,
  cardBackUrl,
  onReveal,
}) => {
  const [flipped, setFlipped] = useState(false);
  const glowClass = RARITY_GLOW[card.rarity] ?? '';
  
  // Randomized entry rotation
  const randomRotation = useMemo(() => (Math.random() - 0.5) * 15, []);

  const handleClick = () => {
    if (flipped) return;
    audioService.play('click');
    setFlipped(true);
    
    // Play rarity-specific sound
    if (['Rare', 'Super-Rare', 'Mythic', 'Divine'].includes(card.rarity)) {
      audioService.play('rare_reveal');
    } else {
      audioService.play('card_reveal');
    }

    setTimeout(onReveal, 800);
  };

  const cardSize = {
    'Divine':     'w-80 h-[426px]',
    'Mythic':     'w-80 h-[426px]',
    'Super-Rare': 'w-72 h-[384px]',
    'Rare':       'w-64 h-[340px]',
    'Uncommon':   'w-56 h-[298px]',
    'Common':     'w-56 h-[298px]',
  }[card.rarity] ?? 'w-64 h-[340px]';

  return (
    <div className="relative flex items-center justify-center">
      {/* Full-screen Rarity Burst */}
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

      {/* Directional Confetti for Divine/Mythic */}
      {flipped && ['Divine', 'Mythic'].includes(card.rarity) && (
        <div className="absolute inset-0 pointer-events-none z-[110]">
          {[...Array(24)].map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const distance = 300 + Math.random() * 200;
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ 
                  left: '50%', 
                  top: '50%',
                  backgroundColor: RARITY_COLORS[card.rarity]
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
              />
            );
          })}
        </div>
      )}

      <motion.div
        initial={{ scale: 0, rotateZ: randomRotation, y: 100 }}
        animate={{ scale: 1, rotateZ: 0, y: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 260, 
          damping: 20,
          delay: 0.1
        }}
        className={cn("relative cursor-pointer select-none", cardSize)}
        style={{ perspective: '1200px' }}
        onClick={handleClick}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 50 && !flipped) {
            handleClick();
          }
        }}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ 
            duration: 0.7, 
            ease: [0.23, 1, 0.32, 1] // Custom physical snap easing
          }}
        >
          {/* BACK FACE */}
          <div
            className="absolute inset-0 rounded-xl border-4 border-[var(--border)] overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <img src={getCardBackUrl(cardBackUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            {!flipped && (
              <div className="absolute inset-0 flex items-end justify-center pb-8 bg-gradient-to-t from-black/40 to-transparent">
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white text-sm font-black uppercase tracking-[0.2em] drop-shadow-lg"
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
            {/* Artwork */}
            <div className="absolute inset-0 bg-slate-900">
              {card.is_video ? (
                <video src={card.image_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
            </div>

            {/* Foil Effect */}
            {card.is_foil && (
              <motion.div 
                animate={{ 
                  backgroundPosition: ['0% 0%', '100% 100%'],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none mix-blend-overlay z-20" 
                style={{ backgroundSize: '200% 200%' }}
              />
            )}

            {/* Rarity/New Badges */}
            <div className="absolute top-3 right-3 z-30">
              <motion.span 
                initial={{ scale: 0, rotate: -20 }}
                animate={flipped ? { scale: 1, rotate: 0 } : {}}
                transition={{ delay: 0.4, type: 'spring' }}
                className={cn(
                  'text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-2 shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                  getRarityStyles(card.rarity, card.is_foil)
                )}
              >
                {card.is_foil ? <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Foil</span> : card.rarity}
              </motion.span>
            </div>

            {card.is_new && (
              <motion.div 
                initial={{ scale: 0, x: -20 }}
                animate={flipped ? { scale: 1, x: 0 } : {}}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute top-3 left-3 z-30 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-md border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              >
                NEW!
              </motion.div>
            )}

            {/* Info Panel - Slides in from bottom */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={flipped ? { y: 0 } : { y: '100%' }}
              transition={{ delay: 0.5, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-12 pb-4 px-4 z-20"
            >
              <h4 className="text-white font-black text-lg uppercase leading-tight mb-1">{card.name}</h4>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-3">
                {card.card_type} {card.element ? `· ${card.element}` : ''}
              </p>

              {(card.hp || card.attack || card.defense) && (
                <div className="flex gap-4 mb-3">
                  {card.hp && (
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                      <span className="text-white font-black text-sm">{card.hp}</span>
                    </div>
                  )}
                  {card.attack && (
                    <div className="flex items-center gap-1.5">
                      <Sword className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-white font-black text-sm">{card.attack}</span>
                    </div>
                  )}
                  {card.defense && (
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-white font-black text-sm">{card.defense}</span>
                    </div>
                  )}
                </div>
              )}

              {card.flavor_text && (
                <p className="text-gray-300 text-[10px] italic leading-relaxed line-clamp-2">
                  {card.flavor_text}
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

