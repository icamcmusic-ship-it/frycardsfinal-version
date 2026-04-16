import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import { Check, Lock, Unlock, ShoppingCart, Plus, Star, Heart } from 'lucide-react';

export function CollectionCard({ card, className, isBatchMode, isSelected, activeTab, onSelect, onToggleLock, onQuicksell, onList, onToggleWishlist, isWishlisted, hideActions = false, showQuantity = false }: any) {
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
        "relative group cursor-pointer transition-all duration-300",
        isSelected ? "ring-4 ring-blue-500/50 rounded-3xl" : "",
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
        showQuantity={showQuantity && (card.quantity || 0) > 1}
        onToggleLock={() => onToggleLock && onToggleLock()}
        onToggleWishlist={() => onToggleWishlist && onToggleWishlist()}
        isWishlisted={isWishlisted}
      />
    </motion.div>
  );
}
