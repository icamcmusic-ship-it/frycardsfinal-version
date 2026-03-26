import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import { Check, Lock, Unlock, ShoppingCart, Plus, Star } from 'lucide-react';

export function CollectionCard({ card, className, isBatchMode, isSelected, activeTab, onSelect, onToggleLock, onQuicksell, onList, onToggleWishlist }: any) {
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
      
      <CardDisplay card={card} />

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
