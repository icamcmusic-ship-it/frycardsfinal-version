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
  const rarityBorder: Record<string, string> = {
    'Divine':     'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8),0_0_40px_rgba(239,68,68,0.4)]',
    'Mythic':     'border-yellow-400 shadow-[0_0_16px_rgba(234,179,8,0.8),0_0_30px_rgba(234,179,8,0.4)]',
    'Super-Rare': 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.7)]',
    'Rare':       'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    'Uncommon':   'border-green-500',
    'Common':     'border-slate-400',
  };

  const border = rarityBorder[card.rarity] ?? rarityBorder['Common'];

  return (
    <div className={cn(
      'relative w-full aspect-[3/4] rounded-xl overflow-hidden border-4 group cursor-pointer',
      'transition-all duration-300 hover:scale-105',
      border,
      className
    )}>
      {/* Full bleed artwork */}
      {card.is_video ? (
        <video src={card.image_url} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <img src={card.image_url} alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = '/fallback-card.png'; }} />
      )}

      {/* Foil shimmer overlay */}
      {(card.is_foil || (card.foil_quantity ?? 0) > 0) && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-[foilShimmer_2s_linear_infinite] pointer-events-none z-10" />
      )}

      {/* Divine/Mythic animated glow border overlay */}
      {(card.rarity === 'Divine' || card.rarity === 'Mythic') && (
        <div className={cn(
          "absolute inset-0 pointer-events-none z-10 rounded-xl",
          card.rarity === 'Divine'
            ? 'animate-[divinePulse_2s_ease-in-out_infinite] border-4 border-red-400/60'
            : 'animate-[mythicPulse_2.5s_ease-in-out_infinite] border-4 border-yellow-300/60'
        )} />
      )}

      {/* Rarity badge — top left */}
      <div className={cn(
        "absolute top-2 left-2 z-20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]",
        getRarityStyles(card.rarity, card.is_foil ?? false)
      )}>
        {card.is_foil ? '✨ Foil' : card.rarity}
      </div>

      {/* Quantity badge — top right */}
      {showQuantity && card.quantity != null && card.quantity > 1 && (
        <div className="absolute top-2 right-2 z-20 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white/30">
          ×{card.quantity}
        </div>
      )}

      {/* NEW badge */}
      {showNewBadge && card.is_new && (
        <div className="absolute top-8 left-2 z-20 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-black animate-bounce uppercase">
          New!
        </div>
      )}

      {/* Bottom gradient + name overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-2 px-2 z-20">
        <p className="text-white font-black text-xs uppercase tracking-wide truncate leading-tight">{card.name}</p>
        <p className="text-white/60 text-[10px] font-bold">{card.element || card.card_type}</p>
      </div>

      {/* Hover overlay with quick-actions */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex flex-col items-center justify-center gap-2 p-3">
        <p className="text-white font-black text-sm uppercase tracking-wide text-center">{card.name}</p>
        <p className="text-gray-300 text-[11px] font-bold">{card.rarity}</p>
        {card.flavor_text && (
          <p className="text-gray-400 text-[10px] italic text-center line-clamp-3">"{card.flavor_text}"</p>
        )}
      </div>
    </div>
  );
}
