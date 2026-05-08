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
    power_grade?: string;
    cast_cost?: number;
    defense?: number;
    keyword?: string;
    keyword_tier?: number;
    card_rarity_id?: number;
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
  const isFoil = Boolean(card.is_foil);
  const lowPerf = JSON.parse(localStorage.getItem('frycards_settings') || '{}').low_perf_mode;

  // Derive Grade Background
  const GRADE_MAP: Record<string, string> = {
    'S': 'bg-red-500 text-white border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
    'A': 'bg-orange-500 text-white border-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.4)]',
    'B': 'bg-blue-500 text-white border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.4)]',
    'C': 'bg-slate-500 text-white border-slate-300 shadow-[0_0_10px_rgba(100,116,139,0.4)]',
    'D': 'bg-slate-400 text-white border-slate-200 shadow-[0_0_10px_rgba(148,163,184,0.4)]',
  };
  const gradeStyles = GRADE_MAP[card.power_grade || 'C'] || 'bg-slate-200 text-black border-slate-300';

  return (
    <div 
      className={cn(
        'card-base brut-border brut-shadow transition-all duration-300 group hover:-translate-y-2 hover:scale-[1.02]',
        rarityKey === 'divine' && card.is_video && 'effect-divine',
        isFoil && !lowPerf && 'foil-shine',
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
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.png'; }}
        />
      )}
 
      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Top Section: Type & Rarity Stickers */}
        <div className="absolute top-[6cqw] left-[6cqw] -rotate-12 z-20 flex flex-col gap-[1cqw]">
          {/* Grade Badge */}
          {card.power_grade && (
            <div className={cn(
              "sticker w-[11cqw] h-[11cqw] rounded-xl border-[0.8cqw] shadow-xl flex items-center justify-center rotate-6 transition-transform group-hover:scale-110",
              gradeStyles
            )}>
              <span className="text-[6cqw] font-black leading-none drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">{card.power_grade}</span>
            </div>
          )}

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

          {/* Cast Cost */}
          {card.cast_cost != null && (
            <div className="sticker w-[12cqw] h-[12cqw] rounded-full bg-slate-100 border-[0.8cqw] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transform -translate-y-[2cqw] -rotate-12">
              <span className="text-[6cqw] font-black text-black">{card.cast_cost}</span>
            </div>
          )}
        </div>
 
        <div className="absolute top-[6cqw] right-[6cqw] rotate-6 z-20 flex flex-col items-end gap-[1.5cqw]">
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

          {/* Keyword Badge */}
          {card.keyword && (
            <div className="sticker px-[2.5cqw] py-[1.2cqw] rounded-xl bg-black text-yellow-400 border-[0.6cqw] border-yellow-400/50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-[1cqw] transition-transform group-hover:-translate-y-1">
              <span className="text-[2.8cqw] font-black uppercase tracking-tighter">
                {card.keyword} {card.keyword_tier > 0 && `v${card.keyword_tier}`}
              </span>
            </div>
          )}

          {/* Effect Text */}
          {card.effect_text && (
            <div className="sticker mt-[1cqw] px-[2.5cqw] py-[1.5cqw] rounded-lg bg-white/90 border-[0.6cqw] border-black text-[2.2cqw] font-bold text-black leading-snug">
              {card.effect_text}
            </div>
          )}

          {/* Defense Score - Units & Artifacts only */}
          {card.defense != null && (card.card_type === 'Unit' || card.card_type === 'Artifact') && (
            <div className="sticker w-[14cqw] h-[14cqw] rounded-lg bg-blue-600 text-white border-[0.8cqw] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center transform rotate-6">
              <span className="text-[2cqw] font-black uppercase leading-none mb-[0.5cqw]">DEF</span>
              <span className="text-[5cqw] font-black leading-none">{card.defense}</span>
            </div>
          )}
        </div>
 
        { card.serial_number != null && card.serial_number > 0 && (
          <div className="absolute bottom-[20cqw] right-[4cqw] flex flex-col items-end gap-[1cqw] z-30">
            <div className="sticker px-[2cqw] py-[1cqw] rounded-[2cqw] border-[0.6cqw] border-black bg-white text-black rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
              <span className="text-[2.5cqw] font-black uppercase tracking-tighter">🔢 Serialized Edition</span>
            </div>
            <div className="sticker px-[2cqw] py-[1cqw] rounded-[2cqw] border-[0.6cqw] border-black bg-black text-white -rotate-3 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] whitespace-nowrap">
              <span className="text-[3cqw] font-black uppercase tracking-tighter">
                #{card.serial_number}/{card.max_serial_supply ?? 200}
              </span>
            </div>
          </div>
        )}

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
        {showQuantity && ((card.quantity != null && card.quantity > 0) || (card.foil_quantity != null && card.foil_quantity > 0) || (card.is_serialized && card.quantity > 0)) && (
          <div className="sticker absolute bottom-[4cqw] left-[-2cqw] bg-black text-white px-[3cqw] py-[1.5cqw] rounded-[2.5cqw] border-[0.6cqw] border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center gap-[1.5cqw] z-30 max-w-[90%]">
            {card.is_serialized ? (
              <span className="text-[4.5cqw] font-black leading-none text-yellow-300 flex items-center">
                🔢×{card.quantity || 1}
              </span>
            ) : (
              <>
                {card.quantity != null && card.quantity > 0 && (
                  <span className="text-[4.5cqw] font-black leading-none">×{card.quantity}</span>
                )}
                {card.foil_quantity != null && card.foil_quantity > 0 && (
                  <span className="badge-foil text-[4.5cqw] font-black leading-none text-yellow-400 flex items-center">
                    {card.quantity != null && card.quantity > 0 && <span className="mx-[0.5cqw] text-white/50 text-[3cqw]">+</span>}
                    ✨×{card.foil_quantity}
                  </span>
                )}
              </>
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
