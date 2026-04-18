import React from 'react';
import { cn } from '../lib/utils';
import { Lock, Unlock, Star, Coins } from 'lucide-react';

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
    slot_type?: string;
    set_name?: string;
    set_theme_color?: string;
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
  const rarityKey = (card.rarity || 'common').toLowerCase().replace(/\s+/g, '-');
  const RARITY_COLOR_MAP: Record<string, string> = {
    'common':     'gray',
    'uncommon':   'green',
    'rare':       'blue',
    'super-rare': 'purple',
    'mythic':     'gold',
    'divine':     'red',
  };
  const colorKey = RARITY_COLOR_MAP[rarityKey] ?? 'gray';
  const isFoil = card.is_foil || (card.foil_quantity ?? 0) > 0;

  return (
    <div 
      className={cn(
        'card-base brut-border brut-shadow transition-all duration-300 group',
        rarityKey === 'super-rare' && 'effect-sr',
        rarityKey === 'mythic' && 'effect-mythic',
        rarityKey === 'divine' && 'effect-divine',
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
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.png'; }}
        />
      )}

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Top Section: Type & Rarity Stickers */}
        <div className="absolute top-[4cqw] left-[4cqw] -rotate-12">
          {/* Type Sticker */}
          <div className={cn(
            "sticker flex items-center justify-center w-[22cqw] h-[22cqw] rounded-full brut-border overflow-hidden",
            `color-${colorKey}`,
            `shadow-${colorKey}`
          )}>
            <span className="text-[3cqw] font-black uppercase tracking-tighter text-center leading-none px-[1cqw] truncate w-full">
              {card.card_type || 'Unit'}
            </span>
          </div>
        </div>

        <div className="absolute top-[4cqw] right-[4cqw] rotate-6">
          {/* Rarity Sticker */}
          <div className={cn(
            "sticker relative px-[3cqw] py-[1.5cqw] rounded-[3cqw] brut-border flex flex-col items-center justify-center",
            isFoil ? "badge-foil" : "bg-white-trans",
            `shadow-${colorKey}`
          )}>
            {isFoil && (
              <span className="text-[2.5cqw] font-black uppercase tracking-widest leading-none mb-[1cqw]">
                Foil Edition
              </span>
            )}
            <span className={cn(
              "text-[4cqw] font-black uppercase leading-none",
              colorKey === 'green' ? 'text-green-800' :
              colorKey === 'blue' ? 'text-blue-800' :
              colorKey === 'purple' ? 'text-purple-800' :
              colorKey === 'gold' ? 'text-yellow-700' :
              colorKey === 'red' ? 'text-red-700' : 'text-slate-700'
            )}>
              {card.rarity}
            </span>
          </div>
        </div>

        {/* Bottom Section: Title & Flavor Text */}
        <div className="absolute bottom-[4cqw] left-[4cqw] right-[4cqw] flex flex-col gap-[2cqw] items-center">
          {/* Set Indicator - Subtle hover reveal */}
          {card.set_name && (
            <div 
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-[2cqw] py-[0.5cqw] rounded-full border-[0.5cqw] border-black text-[2.5cqw] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-[-1cqw] z-20"
              style={{ backgroundColor: card.set_theme_color || '#fff', color: '#000' }}
            >
              {card.set_name}
            </div>
          )}

          {/* Title Sticker */}
          <div className={cn(
            "sticker relative bg-white-trans px-[4cqw] py-[3cqw] rounded-[4cqw] brut-border -rotate-2 w-full flex items-center justify-center min-h-[14cqw]",
            `shadow-${colorKey}`
          )}>
            <h2 className={cn(
              "font-black uppercase text-center leading-none text-black",
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
              "sticker relative px-[4cqw] py-[2cqw] rounded-br-[6cqw] rounded-tl-[6cqw] brut-border rotate-3 self-end max-w-[85%]",
              `color-${colorKey}`,
              `shadow-${colorKey}`
            )}>
              <p className="text-[3.5cqw] font-bold leading-tight italic text-black">
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
        {showQuantity && ((card.quantity != null && card.quantity > 1) || (card.foil_quantity != null && card.foil_quantity > 0)) && (
          <div className="sticker absolute bottom-[4cqw] left-[-2cqw] bg-black text-white px-[3cqw] py-[1.5cqw] rounded-[2.5cqw] border-[0.6cqw] border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-[1.5cqw] z-30">
            {card.quantity != null && card.quantity > 0 && (
              <span className="text-[4.5cqw] font-black leading-none">×{card.quantity}</span>
            )}
            {card.foil_quantity != null && card.foil_quantity > 0 && (
              <span className="text-[4.5cqw] font-black leading-none text-yellow-400 flex items-center">
                {card.quantity != null && card.quantity > 1 && <span className="mx-[0.5cqw]">+</span>} ✨×{card.foil_quantity}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-[28cqw] right-[4cqw] flex flex-col gap-[2cqw] pointer-events-auto">
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

        {/* Hover Info Tooltip */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-110">
           <div className="bg-black/90 text-white px-[4cqw] py-[3cqw] rounded-[4cqw] border-[0.6cqw] border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-[2cqw] min-w-[35cqw]">
              <div className="flex flex-col">
                 <span className="text-[2.5cqw] font-black uppercase text-slate-400 tracking-widest leading-none mb-[1cqw]">Yield</span>
                 <span className="text-[4cqw] font-black leading-none flex items-center gap-[1.5cqw]">
                    <Coins className="w-[3.5cqw] h-[3.5cqw] text-yellow-400" />
                    {(() => {
                      const baseValue = { common: 10, uncommon: 25, rare: 100, 'super-rare': 250, mythic: 500, divine: 1000 }[rarityKey] ?? 10;
                      return (isFoil ? baseValue * 3 : baseValue).toLocaleString();
                    })()}
                 </span>
              </div>
              <div className="h-[0.4cqw] bg-white/20 rounded-full" />
              <div className="flex flex-col">
                 <span className="text-[2.5cqw] font-black uppercase text-slate-400 tracking-widest leading-none mb-[1cqw]">Value</span>
                 <span className="text-[4cqw] font-black leading-none flex items-center gap-[1.5cqw]">
                    <Star className="w-[3.5cqw] h-[3.5cqw] text-purple-400" />
                    {(() => {
                      const xpValue = { common: 5, uncommon: 15, rare: 50, 'super-rare': 150, mythic: 500, divine: 2500 }[rarityKey] ?? 5;
                      return (isFoil ? xpValue * 5 : xpValue).toLocaleString();
                    })()} XP
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
