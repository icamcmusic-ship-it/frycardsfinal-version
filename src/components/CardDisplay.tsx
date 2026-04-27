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
  const isSerializedRarity = card.rarity === 'Mythic' || card.rarity === 'Divine';
  const isFoil = !isSerializedRarity && (card.is_foil || (card.foil_quantity ?? 0) > 0);

  return (
    <div 
      className={cn(
        'card-base brut-border brut-shadow transition-all duration-300 group hover:-translate-y-2 hover:scale-[1.02]',
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
        <div className="absolute top-[6cqw] left-[6cqw] -rotate-12 z-20">
          {/* Type Sticker */}
          <div className={cn(
            "sticker shrink-0 w-[22cqw] h-[22cqw] rounded-full brut-border shadow-sm flex items-center justify-center",
            `color-${colorKey}`,
            `shadow-${colorKey}`
          )}>
            <span className="text-[3cqw] font-black uppercase tracking-tighter text-center leading-none px-[1cqw] truncate">
              {card.card_type || 'Unit'}
            </span>
          </div>
        </div>

        <div className="absolute top-[6cqw] right-[6cqw] rotate-6 z-20">
          {/* Rarity Sticker */}
          <div className={cn(
            "sticker relative px-[3cqw] py-[1.5cqw] rounded-[3cqw] brut-border shadow-sm flex flex-col",
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

          { (card.serial_number || card.serial_no || card.serial || card.serial_id) && (card.serial_number || card.serial_no || card.serial || card.serial_id) > 0 && (
            <div className="absolute top-[6cqw] right-[6cqw] mt-[14cqw] sticker px-[2cqw] py-[1cqw] rounded-[2cqw] brut-border bg-black text-yellow-300 z-30 -rotate-3 shadow-gold shadow-sm">
              <span className="text-[3cqw] font-black uppercase tracking-tighter">
                #{card.serial_number || card.serial_no || card.serial || card.serial_id}/{card.max_serial_supply ?? 200}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section: Title & Flavor Text */}
        <div className="absolute bottom-[4cqw] left-[2cqw] right-[2cqw] flex flex-col gap-[1.5cqw] items-center pointer-events-none">
          {/* Set Indicator */}
          {card.set_name && (
            <div 
              className="sticker absolute bottom-[16cqw] right-[3cqw] px-[2cqw] py-[1cqw] rounded-[3cqw] brut-border rotate-1 z-20 flex items-center justify-center min-w-[15cqw]"
              style={{ backgroundColor: card.set_theme_color ? `${card.set_theme_color}` : 'rgba(255,255,255,0.95)' }}
            >
              <span className="text-[2.2cqw] font-black uppercase tracking-widest text-black">
                {card.set_name}
              </span>
            </div>
          )}

          {/* Title Sticker */}
          <div className="w-full px-[2cqw]">
            <div className={cn(
              "sticker relative bg-white-trans px-[4cqw] py-[3cqw] rounded-[4cqw] brut-border -rotate-2 w-full min-h-[14cqw]",
              `shadow-${colorKey}`
            )}>
              <h2 className={cn(
                "font-black uppercase text-center leading-[1.1] text-black",
                card.name.length > 20 ? "text-[4.5cqw]" : 
                card.name.length > 15 ? "text-[5.5cqw]" : 
                "text-[7.5cqw]"
              )}>
                {card.name}
              </h2>
            </div>
          </div>

          {/* Flavor Text Sticker */}
          {card.flavor_text && (
            <div 
              className="sticker relative mt-[1cqw] self-end mr-[4cqw] px-[3cqw] py-[1.5cqw] rounded-[3cqw] brut-border rotate-3 bg-white/95 z-20 shadow-sm"
              style={{ maxWidth: '85%' }}
            >
               <p className="text-[2.8cqw] font-bold leading-tight italic text-black">
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
        {showQuantity && ((card.quantity != null && card.quantity > 0) || (card.foil_quantity != null && card.foil_quantity > 0)) && (
          <div className="sticker absolute bottom-[4cqw] left-[-2cqw] bg-black text-white px-[3cqw] py-[1.5cqw] rounded-[2.5cqw] border-[0.6cqw] border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-[1.5cqw] z-30">
            {card.quantity != null && card.quantity > 0 && (
              <span className="text-[4.5cqw] font-black leading-none">×{card.quantity}</span>
            )}
            {card.foil_quantity != null && card.foil_quantity > 0 && (
              <span className="text-[4.5cqw] font-black leading-none text-yellow-400 flex items-center">
                {card.quantity != null && card.quantity > 0 && <span className="mr-[0.5cqw]">+</span>}✨×{card.foil_quantity}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-[28cqw] right-[4cqw] flex flex-col gap-[2cqw] pointer-events-auto">
          {onToggleLock && (card.user_card_id || card.id.length > 10) && (
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
