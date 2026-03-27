import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import { Check, Lock, Unlock, ShoppingCart, Plus, Star, Heart } from 'lucide-react';

const rarityColors: Record<string, string> = {
  'Common':     'border-l-slate-400',
  'Uncommon':   'border-l-green-500',
  'Rare':       'border-l-blue-500',
  'Super-Rare': 'border-l-purple-500',
  'Mythic':     'border-l-yellow-500',
  'Divine':     'border-l-red-500',
};

const elementColors: Record<string, string> = {
  'Fire': 'bg-red-500 text-white',
  'Water': 'bg-blue-500 text-white',
  'Earth': 'bg-yellow-700 text-white',
  'Wind': 'bg-teal-400 text-black',
  'Dark': 'bg-purple-900 text-white',
  'Light': 'bg-yellow-300 text-black',
};

export function CollectionCard({ card, className, isBatchMode, isSelected, activeTab, onSelect, onToggleLock, onQuicksell, onList, onToggleWishlist, isWishlisted, hideActions = false }: any) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -10;
    const tiltY = ((x - centerX) / centerX) * 10;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, rotateX: tilt.x, rotateY: tilt.y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      style={{ perspective: 1000 }}
      className={cn(
        "relative overflow-hidden group cursor-pointer transition-all duration-300",
        isSelected ? "ring-4 ring-blue-500/50 rounded-xl" : "",
        className
      )}
    >
      {isBatchMode && (
        <div className={cn(
          "absolute top-2 right-2 z-40 w-6 h-6 rounded-full border-2 border-[var(--border)] flex items-center justify-center",
          isSelected ? "bg-blue-500 text-white" : "bg-[var(--surface)]"
        )}>
          {isSelected && <Check className="w-4 h-4" />}
        </div>
      )}

      {/* NEW badge with animation */}
      <AnimatePresence>
        {card.is_new && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-40 shadow-sm"
          >
            NEW
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foil Badge */}
      {(card.foil_quantity > 0 || card.is_foil) && (
        <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-sm z-40">
          ✨ FOIL
        </div>
      )}

      {/* Element Badge */}
      {card.element && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-40">
          <span className={cn("text-[7px] font-black px-1.5 py-0.5 rounded uppercase border border-black/20 shadow-sm",
            elementColors[card.element] ?? 'bg-slate-200 text-slate-700')}>
            {card.element}
          </span>
        </div>
      )}
      
      <div className={cn(
        "relative border-4 border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]",
        "border-l-[6px]", rarityColors[card.rarity] ?? 'border-l-slate-400',
        card.is_foil && "ring-2 ring-yellow-400 ring-offset-1",
        card.is_foil && "foil-shimmer"
      )}>
        <CardDisplay 
          card={card} 
          showNewBadge={false} 
          onToggleLock={() => onToggleLock && onToggleLock()}
          onToggleWishlist={() => onToggleWishlist && onToggleWishlist()}
          isWishlisted={isWishlisted}
          activeTab={activeTab}
        />
      </div>
    </motion.div>
  );
}
