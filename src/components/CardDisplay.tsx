import React from 'react';
import { cn } from '../lib/utils';
import { Lock, Unlock, Star } from 'lucide-react';

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
    is_locked?: boolean;
    // Other fields are ignored as per user request
    [key: string]: any; 
  };
  showQuantity?: boolean;
  showNewBadge?: boolean;
  className?: string;
  onToggleLock?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
}

export function CardDisplay({ 
  card, 
  showQuantity = true, 
  showNewBadge = true, 
  className,
  onToggleLock,
  onToggleWishlist,
  isWishlisted
}: CardDisplayProps) {
  const rarityKey = card.rarity.toLowerCase().replace(' ', '-');
  const isFoil = card.is_foil || (card.foil_quantity ?? 0) > 0;

  return (
    <div 
      className={cn(
        'card-base brut-border brut-shadow transition-all duration-300 group',
        `color-${rarityKey}`,
        card.rarity === 'Super-Rare' && 'effect-sr',
        card.rarity === 'Mythic' && 'effect-mythic',
        card.rarity === 'Divine' && 'effect-divine',
        isFoil && 'foil-shine',
        className
      )}
    >
      {/* Background Art - Full Card */}
      {card.is_video ? (
        <video 
          src={card.image_url} 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="full-art" 
        />
      ) : (
        <img 
          src={card.image_url} 
          alt={card.name} 
          className="full-art" 
          referrerPolicy="no-referrer" 
        />
      )}

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full p-3 pointer-events-none flex flex-col justify-between">
        {/* Top Section: Type & Rarity Stickers */}
        <div className="flex justify-between items-start">
          {/* Type Sticker (Magical/Fire/etc - wait, user said "type" which is card_type) */}
          <div className={cn(
            "sticker top-4 left-4 w-16 h-16 rounded-full brut-border flex items-center justify-center -rotate-12",
            `color-${rarityKey}`,
            `shadow-${rarityKey}`
          )}>
            <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
              {card.card_type || 'Unit'}
            </span>
          </div>

          {/* Rarity Sticker */}
          <div className={cn(
            "sticker top-6 right-4 px-3 py-1.5 rounded-xl brut-border rotate-6 flex flex-col items-center justify-center",
            isFoil ? "badge-foil" : "bg-white-trans",
            `shadow-${rarityKey}`
          )}>
            {isFoil && (
              <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">
                Foil Edition
              </span>
            )}
            <span className={cn(
              "text-xs font-black uppercase leading-none",
              rarityKey === 'uncommon' ? 'text-green-800' :
              rarityKey === 'rare' ? 'text-blue-800' :
              rarityKey === 'super-rare' ? 'text-purple-800' :
              rarityKey === 'mythic' ? 'text-yellow-700' :
              rarityKey === 'divine' ? 'text-red-700' : 'text-slate-700'
            )}>
              {card.rarity}
            </span>
          </div>
        </div>

        {/* Middle/Bottom Section: Title & Flavor Text */}
        <div className="flex flex-col gap-3 mb-2">
          {/* Title Sticker */}
          <div className={cn(
            "sticker relative bg-white-trans px-4 py-3 rounded-2xl brut-border -rotate-2 self-center w-[90%]",
            `shadow-${rarityKey}`
          )}>
            <h2 className="text-[22px] font-black uppercase text-center leading-none truncate">
              {card.name}
            </h2>
          </div>

          {/* Flavor Text Sticker */}
          {card.flavor_text && (
            <div className={cn(
              "sticker relative px-4 py-2 rounded-br-3xl rounded-tl-3xl brut-border rotate-3 self-end max-w-[80%]",
              `color-${rarityKey}`,
              `shadow-${rarityKey}`
            )}>
              <p className="text-[10px] font-bold leading-tight italic">
                "{card.flavor_text}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* UI Interaction Layer (Buttons) - Always visible/clickable */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* NEW Badge */}
        {showNewBadge && card.is_new && (
          <div className="absolute top-2 left-20 z-30 bg-yellow-400 text-black text-[8px] font-black px-2 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase animate-bounce">
            New!
          </div>
        )}

        {/* Quantity Badge */}
        {showQuantity && card.quantity != null && card.quantity > 1 && (
          <div className="absolute bottom-2 left-2 z-30 bg-black text-white text-[10px] font-black px-2 py-1 rounded-lg border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ×{card.quantity}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 right-20 flex gap-2 pointer-events-auto">
          {onToggleLock && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
              className={cn(
                "p-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:scale-90 bg-white",
                card.is_locked ? "text-red-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {card.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          )}
          {onToggleWishlist && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
              className={cn(
                "p-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:scale-90 bg-white",
                isWishlisted ? "text-yellow-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Star className={cn("w-3 h-3", isWishlisted && "fill-current")} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
