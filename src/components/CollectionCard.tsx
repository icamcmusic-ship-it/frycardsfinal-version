import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import { Check, Lock, Unlock, ShoppingCart, Plus, Star, Heart } from 'lucide-react';

export function CollectionCard({ card, className, isBatchMode, isSelected, onSelect, onToggleLock, onQuicksell, onList, onToggleWishlist, isWishlisted, hideActions = false, showQuantity = false }: any) {
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
      style={{ perspective: 1000, containerType: 'inline-size' }}
      className={cn(
        "relative group cursor-pointer transition-all duration-300 [container-type:inline-size]",
        isSelected ? "ring-4 ring-blue-600 rounded-3xl shadow-lg brightness-105" : "",
        className
      )}
    >
      {isBatchMode && (
        <div className={cn(
          "absolute top-2 right-2 z-50 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center",
          isSelected ? "bg-blue-500 text-white" : "bg-white"
        )}>
          {isSelected && <Check className="w-4 h-4" />}
        </div>
      )}

      <CardDisplay 
        card={card} 
        showNewBadge={true} 
        showQuantity={showQuantity && ((card.quantity || 0) + (card.foil_quantity || 0) > 1)}
        onToggleLock={!hideActions && onToggleLock ? () => onToggleLock() : undefined}
        onToggleWishlist={!hideActions && onToggleWishlist ? () => onToggleWishlist() : undefined}
        isWishlisted={isWishlisted}
      />

      {/* Grid Quick Indicators */}
      <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 pointer-events-none sm:opacity-0 group-hover:opacity-100 transition-opacity">
        {card.power_grade && (
          <div className={cn(
            "px-2 py-0.5 rounded-lg border-2 border-black text-[10px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]",
            card.power_grade === 'S' ? 'bg-red-500 text-white' :
            card.power_grade === 'A' ? 'bg-orange-500 text-white' :
            card.power_grade === 'B' ? 'bg-blue-500 text-white' :
            'bg-slate-500 text-white'
          )}>
            GRADE {card.power_grade}
          </div>
        )}
        {card.keyword && (
          <div className="px-2 py-0.5 rounded-lg border-2 border-black bg-black text-yellow-400 text-[8px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-tighter">
            {card.keyword}
          </div>
        )}
      </div>

      {/* Info Overlay on Hover */}
      {!isBatchMode && card.effect_text && (
        <div className="absolute inset-x-0 bottom-0 z-40 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 pointer-events-none">
          <div className="bg-black/90 text-white p-3 rounded-2xl border-4 border-white shadow-xl">
             <p className="text-[12px] font-black uppercase text-yellow-400 mb-1 leading-none">{card.keyword || 'Ability'}</p>
             <p className="text-[10px] font-bold leading-tight line-clamp-3">{card.effect_text}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
