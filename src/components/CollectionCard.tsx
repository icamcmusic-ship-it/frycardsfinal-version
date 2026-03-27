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

export function CollectionCard({ card, className, isBatchMode, isSelected, activeTab, onSelect, onToggleLock, onQuicksell, onList, onToggleWishlist, isWishlisted }: any) {
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
        <CardDisplay card={card} showNewBadge={false} />

        {/* Wishlist Heart Icon */}
        {onToggleWishlist && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
            className={cn(
              "absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[var(--border)] shadow-sm z-40 transition-all active:scale-90",
              isWishlisted ? "bg-red-500 text-white" : "bg-white/80 text-slate-400 hover:text-red-500"
            )}
          >
            <Heart className="w-3.5 h-3.5" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        )}

        {/* Combat Stats Strip */}
        {card.card_type === 'Unit' && (card.hp != null || card.attack != null) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white flex justify-around text-[9px] font-black py-1 z-20">
            {card.attack != null && <span>⚔ {card.attack}</span>}
            {card.hp != null && <span>❤ {card.hp}</span>}
            {card.defense != null && <span>🛡 {card.defense}</span>}
          </div>
        )}
      </div>

      {/* Action Overlay */}
      {!isBatchMode && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 z-30">
          <div className="flex gap-2">
            {onToggleLock && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                className={cn(
                  "p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_black] transition-transform active:translate-y-0.5",
                  card.is_locked ? "bg-red-400" : "bg-white"
                )}
                title={card.is_locked ? "Unlock Card" : "Lock Card"}
              >
                {card.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}
            {onToggleWishlist && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
                className={cn(
                  "p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_black] transition-transform active:translate-y-0.5",
                  activeTab === 'wishlist' ? "bg-yellow-400" : "bg-white"
                )}
                title={activeTab === 'wishlist' ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Star className={cn("w-4 h-4", activeTab === 'wishlist' && "fill-current")} />
              </button>
            )}
          </div>
          
          {activeTab === 'collection' && !card.is_locked && (
            <div className="flex flex-col w-full gap-2">
              {onList && (
                <button
                  onClick={(e) => { e.stopPropagation(); onList(); }}
                  className="w-full py-1.5 bg-blue-500 text-white font-black text-[10px] uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_black] hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> List Item
                </button>
              )}
              {onQuicksell && (
                <button
                  onClick={(e) => { e.stopPropagation(); onQuicksell(); }}
                  className="w-full py-1.5 bg-emerald-500 text-white font-black text-[10px] uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_black] hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                >
                  <ShoppingCart className="w-3 h-3" /> Quick Sell
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
