import React from 'react';
import { cn, getRarityStyles } from '../lib/utils';

interface CardDisplayProps {
  card: {
    name: string;
    rarity: string;
    card_type?: string;
    image_url: string;
    is_video?: boolean;
    is_foil?: boolean;
    quantity?: number;
    foil_quantity?: number;
    is_new?: boolean;
    flavor_text?: string;
    hp?: number;
    attack?: number;
    defense?: number;
    element?: string;
    keywords?: string[];
    ability_text?: string;
    ability_type?: string;
  };
  showQuantity?: boolean;
  showNewBadge?: boolean;
  className?: string;
}

export function CardDisplay({ card, showQuantity = true, showNewBadge = true, className }: CardDisplayProps) {
  const rarityGlow: Record<string, string> = {
    'Divine': 'shadow-[0_0_20px_rgba(239,68,68,0.8)] border-red-500',
    'Mythic': 'shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-500',
    'Super-Rare': 'shadow-[0_0_15px_rgba(168,85,247,0.5)] border-purple-500',
    'Rare': 'border-blue-500',
    'Uncommon': 'border-green-500',
  };

  const glowClass = rarityGlow[card.rarity] ?? 'border-slate-300';

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden border-4 aspect-[3/4] bg-black group',
      glowClass, className
    )}>
      {/* Art */}
      {card.is_video ? (
        <video
          src={card.image_url}
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <img
          src={card.image_url}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/fallback-card.png'; }}
        />
      )}

      {/* Divine shimmer overlay */}
      {card.rarity === 'Divine' && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-transparent to-orange-500/20 animate-pulse pointer-events-none" />
      )}

      {/* Foil shimmer */}
      {card.is_foil && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/10 animate-[foilShimmer_2s_linear_infinite] pointer-events-none" />
      )}

      {/* Rarity badge — bottom-left corner */}
      <div className={cn(
        'absolute bottom-1 left-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-20',
        getRarityStyles(card.rarity, card.is_foil ?? false)
      )}>
        {card.is_foil ? '✨ Foil' : card.rarity}
      </div>

      {/* Quantity badge — top-right corner */}
      {showQuantity && card.quantity != null && card.quantity > 1 && (
        <div className="absolute top-1 right-1 bg-black text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border-2 border-white z-20">
          x{card.quantity}
        </div>
      )}

      {/* NEW badge */}
      {showNewBadge && card.is_new && (
        <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md border-2 border-black z-20 animate-bounce">
          NEW
        </div>
      )}

      {/* Name bar at bottom */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-5 px-2 z-10">
        <p className="text-white font-black text-[10px] uppercase tracking-widest leading-tight truncate">{card.name}</p>
      </div>
    </div>
  );
}
