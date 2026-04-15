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
  const rarityKey = (card.rarity || 'common').toLowerCase().replace(' ', '-');
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
      <div className="absolute inset-0 z-10 p-[4cqw] pointer-events-none">
        {/* Top Section: Type & Rarity Stickers */}
        <div className="flex justify-between items-start">
          {/* Type Sticker */}
          <div className={cn(
            "sticker !relative flex items-center justify-center w-[22cqw] h-[22cqw] rounded-full brut-border -rotate-12 overflow-hidden",
            `color-${rarityKey}`,
            `shadow-${rarityKey}`
          )}>
            <span className="text-[3cqw] font-black uppercase tracking-tighter text-center leading-none px-[1cqw] truncate w-full">
              {card.card_type || 'Unit'}
            </span>
          </div>

          {/* Rarity Sticker */}
          <div className={cn(
            "sticker !relative px-[3cqw] py-[1.5cqw] rounded-[3cqw] brut-border rotate-6 flex flex-col items-center justify-center",
            isFoil ? "badge-foil" : "bg-white-trans",
            `shadow-${rarityKey}`
          )}>
            {isFoil && (
              <span className="text-[2.5cqw] font-black uppercase tracking-widest leading-none mb-[1cqw]">
                Foil Edition
              </span>
            )}
            <span className={cn(
              "text-[4cqw] font-black uppercase leading-none",
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

        {/* Bottom Section: Title & Flavor Text */}
        <div className="absolute bottom-[4cqw] left-[4cqw] right-[4cqw] flex flex-col gap-[2cqw] items-center">
          {/* Title Sticker */}
          <div className={cn(
            "sticker !relative bg-white-trans px-[4cqw] py-[3cqw] rounded-[4cqw] brut-border -rotate-2 w-full flex items-center justify-center min-h-[14cqw]",
            `shadow-${rarityKey}`
          )}>
            <h2 className={cn(
              "font-black uppercase text-center leading-none",
              card.name.length > 20 ? "text-[5cqw]" : 
              card.name.length > 15 ? "text-[6cqw]" : 
              "text-[8cqw]"
            )}>
              {card.name}
            </h2>
          </div>

          {/* Flavor Text Sticker */}
          {card.flavor_text && (
            <div className={cn(
              "sticker !relative px-[4cqw] py-[2cqw] rounded-br-[6cqw] rounded-tl-[6cqw] brut-border rotate-3 self-end max-w-[85%]",
              `color-${rarityKey}`,
              `shadow-${rarityKey}`
            )}>
              <p className="text-[3.5cqw] font-bold leading-tight italic">
                "{card.flavor_text}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Badges & Actions */}
      <div className="absolute inset-0 z-20 p-[4cqw] pointer-events-none">
        {/* NEW Badge */}
        {showNewBadge && card.is_new && (
          <div className="sticker absolute top-[28cqw] left-[4cqw] bg-yellow-400 text-black px-[3cqw] py-[1cqw] rounded-full brut-border -rotate-12 animate-bounce shadow-black">
            <span className="text-[3.5cqw] font-black italic">New!</span>
          </div>
        )}

        {/* Quantity Badge */}
        {showQuantity && card.quantity != null && card.quantity > 1 && (
          <div className="sticker absolute bottom-[4cqw] left-[-2cqw] bg-black text-white px-[2cqw] py-[1cqw] rounded-[2cqw] border-[0.5cqw] border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[4cqw] font-black">×{card.quantity}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-[2cqw] right-[20cqw] flex gap-[2cqw] pointer-events-auto">
          {onToggleLock && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
              className={cn(
                "p-[1.5cqw] rounded-full border-[0.5cqw] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:scale-90 bg-white",
                card.is_locked ? "text-red-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {card.is_locked ? <Lock className="w-[4cqw] h-[4cqw]" /> : <Unlock className="w-[4cqw] h-[4cqw]" />}
            </button>
          )}
          {onToggleWishlist && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
              className={cn(
                "p-[1.5cqw] rounded-full border-[0.5cqw] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:scale-90 bg-white",
                isWishlisted ? "text-yellow-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Star className={cn("w-[4cqw] h-[4cqw]", isWishlisted && "fill-current")} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
