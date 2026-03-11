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
  
  const rarityConfig: Record<string, { border: string; glow: string; badge: string; icon: string }> = {
    'Divine':     { border: 'border-red-500',    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.9)]',   badge: 'bg-red-500 text-white border-red-700',          icon: '👁' },
    'Mythic':     { border: 'border-yellow-400', glow: 'shadow-[0_0_18px_rgba(234,179,8,0.8)]',   badge: 'bg-yellow-400 text-black border-yellow-600',    icon: '⚡' },
    'Super-Rare': { border: 'border-purple-500', glow: 'shadow-[0_0_14px_rgba(168,85,247,0.7)]',  badge: 'bg-purple-500 text-white border-purple-700',    icon: '✦' },
    'Rare':       { border: 'border-blue-500',   glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',  badge: 'bg-blue-500 text-white border-blue-700',        icon: '◆' },
    'Uncommon':   { border: 'border-green-500',  glow: '',                                          badge: 'bg-green-500 text-white border-green-700',      icon: '●' },
    'Common':     { border: 'border-slate-400',  glow: '',                                          badge: 'bg-slate-600 text-white border-slate-800',      icon: '○' },
  };

  const cfg = rarityConfig[card.rarity] ?? rarityConfig['Common'];

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden border-4 aspect-[3/4] bg-black group',
      cfg.border, cfg.glow, className,
      (card.is_foil || (card.foil_quantity ?? 0) > 0) && "ring-2 ring-yellow-400 animate-pulse"
    )}>
      {/* Art */}
      {card.is_video ? (
        <video src={card.image_url} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <img src={card.image_url} alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/fallback-card.png'; }} />
      )}

      {/* Divine/Mythic shimmer overlay */}
      {(card.rarity === 'Divine' || card.rarity === 'Mythic') && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/5 animate-pulse pointer-events-none" />
      )}

      {/* Foil shimmer */}
      {(card.is_foil || (card.foil_quantity ?? 0) > 0) && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-purple-500/10 to-white/20 pointer-events-none" />
      )}

      {/* ✅ RARITY BADGE — moved to TOP RIGHT, cooler styling */}
      <div className={cn(
        'absolute top-2 right-2 z-20 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]',
        (card.is_foil || (card.foil_quantity ?? 0) > 0)
          ? 'bg-gradient-to-r from-yellow-300 to-pink-400 text-black border-yellow-600'
          : cfg.badge
      )}>
        <span>{cfg.icon}</span>
        <span>{(card.is_foil || (card.foil_quantity ?? 0) > 0) ? '✨ Foil' : card.rarity}</span>
      </div>

      {/* Quantity badge — top-left */}
      {showQuantity && card.quantity != null && card.quantity > 1 && (
        <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white/30 z-20">
          ×{card.quantity}
        </div>
      )}

      {/* NEW badge */}
      {showNewBadge && card.is_new && (
        <div className="absolute top-1 left-1 bg-green-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full z-20 uppercase">
          New
        </div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-2 px-2 z-10">
        <p className="text-white font-black text-[10px] uppercase tracking-widest leading-tight truncate">
          {card.name}
        </p>
      </div>

      {/* ✅ HOVER OVERLAY — cooler, stylized info panel */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex flex-col justify-between p-3">
        
        {/* Top: Type + Element */}
        <div className="flex justify-between items-start">
          <span className={cn(
            'text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border',
            cfg.badge
          )}>
            {cfg.icon} {card.rarity}
          </span>
          {card.element && (
            <span className="text-[9px] font-black uppercase text-blue-300 bg-blue-900/60 px-2 py-1 rounded-full border border-blue-500/40">
              {card.element}
            </span>
          )}
        </div>

        {/* Middle: Stats */}
        <div className="space-y-1">
          {(card.hp != null || card.attack != null || card.defense != null) && (
            <div className="flex gap-2 justify-center">
              {card.hp != null && (
                <div className="flex flex-col items-center bg-red-900/50 border border-red-500/40 rounded-lg px-2 py-1">
                  <span className="text-[8px] text-red-300 font-black uppercase">HP</span>
                  <span className="text-white font-black text-sm">{card.hp}</span>
                </div>
              )}
              {card.attack != null && (
                <div className="flex flex-col items-center bg-orange-900/50 border border-orange-500/40 rounded-lg px-2 py-1">
                  <span className="text-[8px] text-orange-300 font-black uppercase">ATK</span>
                  <span className="text-white font-black text-sm">{card.attack}</span>
                </div>
              )}
              {card.defense != null && (
                <div className="flex flex-col items-center bg-blue-900/50 border border-blue-500/40 rounded-lg px-2 py-1">
                  <span className="text-[8px] text-blue-300 font-black uppercase">DEF</span>
                  <span className="text-white font-black text-sm">{card.defense}</span>
                </div>
              )}
            </div>
          )}
          {card.ability_text && (
            <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-2">
              <p className="text-[8px] font-black text-purple-300 uppercase mb-0.5">{card.ability_type || 'Ability'}</p>
              <p className="text-white text-[9px] font-bold leading-tight line-clamp-3">{card.ability_text}</p>
            </div>
          )}
          {card.flavor_text && !card.ability_text && (
            <p className="text-gray-400 text-[9px] italic text-center leading-tight line-clamp-3">"{card.flavor_text}"</p>
          )}
        </div>

        {/* Bottom: Name + Type */}
        <div className="border-t border-white/10 pt-2">
          <p className="text-white font-black text-xs uppercase tracking-widest leading-tight">{card.name}</p>
          <p className="text-gray-400 text-[9px] font-bold mt-0.5">{card.card_type}</p>
        </div>
      </div>
    </div>
  );
}
