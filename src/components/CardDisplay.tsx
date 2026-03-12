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
  
  const rarityConfig: Record<string, { badge: string; icon: string }> = {
    'Divine':     { badge: 'bg-red-500 text-white',          icon: '👁' },
    'Mythic':     { badge: 'bg-yellow-400 text-black',       icon: '⚡' },
    'Super-Rare': { badge: 'bg-purple-500 text-white',       icon: '✦' },
    'Rare':       { badge: 'bg-blue-500 text-white',         icon: '◆' },
    'Uncommon':   { badge: 'bg-green-500 text-white',        icon: '●' },
    'Common':     { badge: 'bg-slate-600 text-white',        icon: '○' },
  };

  const cfg = rarityConfig[card.rarity] ?? rarityConfig['Common'];

  return (
    <div className={cn(
      'flex flex-col w-full aspect-[5/7] bg-white border-4 border-pink-300 rounded-2xl overflow-hidden p-1 shadow-lg group',
      className
    )}>
      {/* Top: Header */}
      <div className="bg-sky-200 p-2 border-b-2 border-black rounded-t-lg">
        <h2 className="font-black text-sm uppercase leading-tight truncate">{card.name}</h2>
        <div className="flex items-center gap-1 text-[10px] font-bold mt-1">
          <span>{cfg.icon}</span>
          <span>Type: {card.element || card.card_type}</span>
        </div>
      </div>

      {/* Middle: Art */}
      <div className="flex-grow bg-orange-50 relative overflow-hidden border-b-2 border-black">
        {card.is_video ? (
          <video src={card.image_url} autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={card.image_url} alt={card.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/fallback-card.png'; }} />
        )}
      </div>

      {/* Bottom: Rarity + Description */}
      <div className="bg-orange-50 p-2">
        <div className="flex items-center gap-1 font-bold text-xs mb-1">
          <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px]", cfg.badge)}>{cfg.icon}</span>
          <span className="uppercase">{card.rarity}</span>
        </div>
        <p className="text-[10px] leading-tight line-clamp-2 font-medium text-slate-700">
          {card.flavor_text || card.ability_text}
        </p>
      </div>

      {/* Overlays (Quantity, New, Foil) */}
      {showQuantity && card.quantity != null && card.quantity > 1 && (
        <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white/30 z-20">
          ×{card.quantity}
        </div>
      )}
      {showNewBadge && card.is_new && (
        <div className="absolute top-1 left-1 bg-green-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full z-20 uppercase">
          New
        </div>
      )}
      {(card.is_foil || (card.foil_quantity ?? 0) > 0) && (
        <div className="absolute inset-0 pointer-events-none z-10 border-4 border-yellow-400 rounded-2xl animate-pulse" />
      )}
    </div>
  );
}
