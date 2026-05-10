import React from 'react';
import { cn } from '../lib/utils';
import { Lock, Unlock, Star, Coins, Shield, Zap } from 'lucide-react';

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
    set_name?: string;
    set_theme_color?: string;
    cast_cost?: number;
    defense?: number;
    keyword?: string;
    keyword_tier?: number;
    serial_number?: number;
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
  const RARITY_COLOR_MAP: Record<string, { border: string; badge: string; glow: string }> = {
    'common':     { border: 'border-slate-400',  badge: 'bg-slate-200 text-slate-700',  glow: '' },
    'uncommon':   { border: 'border-green-500',  badge: 'bg-green-100 text-green-800',  glow: '' },
    'rare':       { border: 'border-blue-500',   badge: 'bg-blue-100 text-blue-800',    glow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
    'super-rare': { border: 'border-purple-500', badge: 'bg-purple-100 text-purple-800',glow: 'shadow-[0_0_10px_rgba(168,85,247,0.6)]' },
    'mythic':     { border: 'border-yellow-400', badge: 'bg-yellow-100 text-yellow-800',glow: 'shadow-[0_0_14px_rgba(234,179,8,0.7)]' },
    'divine':     { border: 'border-red-500',    badge: 'bg-red-100 text-red-800',      glow: 'shadow-[0_0_16px_rgba(239,68,68,0.8)]' },
  };
  const rStyle = RARITY_COLOR_MAP[rarityKey] ?? RARITY_COLOR_MAP['common'];
  const isFoil = Boolean(card.is_foil);
  const lowPerf = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('frycards_settings') || '{}').low_perf_mode;
    } catch {
      return false;
    }
  }, []);

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border-4 brut-shadow transition-all duration-300',
        'group hover:-translate-y-2 hover:scale-[1.02] cursor-pointer',
        'aspect-[2/3]',
        rarityKey === 'divine' ? 'divine-card' : rarityKey === 'mythic' ? 'mythic-card' : rStyle.border,
        rStyle.glow,
        isFoil && !lowPerf && 'foil-shine',
        className
      )}
    >
      {/* ── ART AREA (4:3) ─────────────────────────────── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden flex-shrink-0 bg-slate-900">
        {card.is_video ? (
          <video
            src={card.image_url}
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={card.image_url}
            alt={card.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.png'; }}
          />
        )}

        {/* Foil shimmer overlay */}
        {isFoil && !lowPerf && (
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent pointer-events-none animate-pulse" />
        )}

        {/* NEW badge */}
        {showNewBadge && card.is_new && (
          <span className="absolute top-1 left-1 bg-yellow-400 text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded border-2 border-black shadow-[1px_1px_0px_0px_#000]">
            NEW
          </span>
        )}

        {/* Foil badge */}
        {isFoil && (
          <span className="absolute top-1 right-1 bg-indigo-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded border-2 border-black shadow-[1px_1px_0px_0px_#000]">
            ✨ FOIL
          </span>
        )}

        {/* Serial number */}
        {card.serial_number && (
          <span className="absolute bottom-1 right-1 bg-black/70 text-yellow-400 text-[9px] font-mono px-1.5 py-0.5 rounded">
            #{card.serial_number}
          </span>
        )}

        {/* Lock indicator */}
        {card.is_locked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-white/80" />
          </div>
        )}
      </div>

      {/* ── INFO AREA (remaining height) ────────────────── */}
      <div className="flex flex-col bg-white dark:bg-slate-900 flex-1 min-h-0 px-2 py-1.5 gap-0.5 border-t-2 border-[var(--border)]">
        {/* Card name */}
        <p className="text-[11px] font-black uppercase leading-tight truncate text-black dark:text-white">
          {card.name}
        </p>

        {/* Stats row: cast cost + keyword + defense */}
        <div className="flex items-center justify-between gap-1">
          
          {/* Cast cost (top-left) */}
          {card.cast_cost != null && (
            <div className="flex items-center gap-0.5 bg-yellow-400 text-black px-1.5 py-0.5 rounded-full border border-black text-[9px] font-black leading-none">
              <Coins className="w-2.5 h-2.5" />
              {card.cast_cost}
            </div>
          )}

          {/* Keyword pill (center) */}
          {card.keyword && (
            <span className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-300 leading-none truncate max-w-[60px]">
              {card.keyword}
            </span>
          )}

          {/* Defense (bottom-right) */}
          {card.defense != null && (
            <div className="flex items-center gap-0.5 bg-slate-800 text-white px-1.5 py-0.5 rounded-full border border-black text-[9px] font-black leading-none">
              <Shield className="w-2.5 h-2.5" />
              {card.defense}
            </div>
          )}
        </div>

        {/* Rarity badge + foil/serial / set info */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full border leading-none", rStyle.badge)}>
            {isFoil ? '✨ ' : ''}{card.rarity}
          </span>
          {card.serial_number && (
            <span className="text-[8px] font-black text-yellow-600 leading-none">
              #{card.serial_number}
            </span>
          )}
          {card.set_name && (
            <span
              className="text-[8px] font-bold uppercase px-1 py-0.5 rounded"
              style={{ backgroundColor: card.set_theme_color + '33', color: card.set_theme_color, border: `1px solid ${card.set_theme_color}` }}
            >
              {card.set_name}
            </span>
          )}
        </div>

        {/* Quantity */}
        {showQuantity && card.quantity != null && card.quantity > 0 && (
          <div className="flex items-center gap-1 mt-auto pb-0.5">
            <span className="text-[9px] font-bold bg-[var(--border)] text-[var(--text)] px-1.5 py-0.5 rounded">
              ×{card.quantity}
            </span>
            {(card.foil_quantity ?? 0) > 0 && (
              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                ✨×{card.foil_quantity}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Lock/Wishlist action buttons (hover) */}
      {(onToggleLock || onToggleWishlist) && (
        <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onToggleLock && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
              className="w-6 h-6 bg-black/70 rounded flex items-center justify-center"
            >
              {card.is_locked ? <Unlock className="w-3 h-3 text-white" /> : <Lock className="w-3 h-3 text-white" />}
            </button>
          )}
          {onToggleWishlist && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
              className="w-6 h-6 bg-black/70 rounded flex items-center justify-center"
            >
              <Star className={cn('w-3 h-3', isWishlisted ? 'text-yellow-400 fill-yellow-400' : 'text-white')} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
