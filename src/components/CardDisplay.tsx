import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Lock, Unlock, Star, Coins, Shield, Zap } from 'lucide-react';
import { CardExpandModal } from './CardExpandModal';

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
    effect_text?: string;
    power_grade?: string;
    serial_number?: number;
    [key: string]: any;
  };
  showQuantity?: boolean;
  showNewBadge?: boolean;
  className?: string;
  onToggleLock?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
  // If true, clicking the card opens the expand modal
  expandable?: boolean;
}

export function CardDisplay({
  card,
  showQuantity = true,
  showNewBadge = true,
  className,
  onToggleLock,
  onToggleWishlist,
  isWishlisted,
  expandable = true,
}: CardDisplayProps) {
  const [expanded, setExpanded] = useState(false);

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
    } catch { return false; }
  }, []);

  const TIER_ROMAN = ['', 'I', 'II', 'III'];

  return (
    <>
      <div
        onClick={() => expandable && setExpanded(true)}
        className={cn(
          'relative flex flex-col overflow-hidden rounded-lg border-4 brut-shadow transition-all duration-300',
          expandable ? 'group hover:-translate-y-2 hover:scale-[1.02] cursor-pointer' : '',
          'aspect-[2/3]',
          rarityKey === 'divine' ? 'divine-card' : rarityKey === 'mythic' ? 'mythic-card' : rStyle.border,
          rStyle.glow,
          isFoil && !lowPerf && 'foil-shine',
          className
        )}
      >
        {/* ── ART AREA (4:3) ── */}
        <div className="relative w-full aspect-[4/3] overflow-hidden flex-shrink-0 bg-slate-900">
          {card.is_video ? (
            <video
              src={card.image_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
                const svg = document.createElement('div');
                svg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package w-8 h-8 text-slate-700"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22.51v-1.1"/><path d="M12 22.3V21"/></svg>';
                (e.target as HTMLImageElement).parentElement?.appendChild(svg);
              }}
            />
          )}

          {/* New badge */}
          {showNewBadge && card.is_new && (
            <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-black/20 shadow-sm z-10">
              NEW
            </div>
          )}

          {/* Foil shimmer overlay */}
          {isFoil && !lowPerf && (
            <div className="absolute inset-0 pointer-events-none z-[1] foil-overlay" />
          )}

          {/* Lock indicator */}
          {card.is_locked && (
            <div className="absolute top-1 right-1 bg-amber-500 text-black rounded-full p-0.5 shadow z-10">
              <Lock className="w-2.5 h-2.5" />
            </div>
          )}

          {/* Serial number */}
          {card.serial_number && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[7px] font-mono px-1 rounded z-10">
              #{card.serial_number}
            </div>
          )}
        </div>

        {/* ── CARD INFO AREA ── */}
        <div className="flex-1 flex flex-col bg-[var(--surface)] p-1.5 gap-0.5">
          {/* Card name */}
          <p className="text-[10px] font-black leading-tight line-clamp-2 text-[var(--text)] uppercase tracking-tight">
            {card.name}
          </p>

          {/* Rarity + type row */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className={cn('text-[7px] font-black uppercase px-1 py-0.5 rounded-sm', rStyle.badge)}>
              {card.rarity}
            </span>
            {card.card_type && (
              <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase">
                {card.card_type}
              </span>
            )}
          </div>

          {/* Stats row: cost + defense */}
          {(card.cast_cost !== undefined || card.defense) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {card.cast_cost !== undefined && (
                <div className="flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-yellow-500" />
                  <span className="text-[8px] font-black text-yellow-600">{card.cast_cost}</span>
                </div>
              )}
              {card.defense && (
                <div className="flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5 text-blue-500" />
                  <span className="text-[8px] font-black text-blue-600">{card.defense}</span>
                </div>
              )}
            </div>
          )}

          {/* ── KEYWORD BADGE — now shows tier number ── */}
          {card.keyword && (
            <div className="flex items-center gap-0.5 mt-auto">
              <Zap className="w-2 h-2 text-amber-500 flex-shrink-0" />
              <span className="text-[7px] font-black text-amber-600 uppercase tracking-tight truncate">
                {card.keyword}
              </span>
              {/* Tier badge — the key addition */}
              {card.keyword_tier && (
                <span className="text-[6px] font-black bg-amber-500 text-black px-1 py-0.5 rounded-full leading-none flex-shrink-0">
                  {TIER_ROMAN[card.keyword_tier] || card.keyword_tier}
                </span>
              )}
            </div>
          )}

          {/* Quantity */}
          {showQuantity && card.quantity !== undefined && card.quantity > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[7px] font-bold text-[var(--text-muted)]">×{card.quantity}</span>
              {card.foil_quantity > 0 && (
                <span className="text-[7px] font-bold text-amber-500">✦×{card.foil_quantity}</span>
              )}
            </div>
          )}
        </div>

        {/* ── HOVER ACTIONS (on toggle-capable cards) ── */}
        {(onToggleLock || onToggleWishlist) && (
          <div className={cn(
            'absolute top-0 right-0 flex flex-col gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20',
            'bg-gradient-to-b from-black/60 to-transparent rounded-bl-lg'
          )}>
            {onToggleLock && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                className={cn(
                  'p-1 rounded-full transition-colors',
                  card.is_locked ? 'bg-amber-500 text-black' : 'bg-black/60 text-white hover:bg-amber-500/80'
                )}
                title={card.is_locked ? 'Unlock card' : 'Lock card'}
              >
                {card.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            )}
            {onToggleWishlist && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
                className={cn(
                  'p-1 rounded-full transition-colors',
                  isWishlisted ? 'bg-pink-500 text-white' : 'bg-black/60 text-white hover:bg-pink-500/80'
                )}
                title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Star className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Expand hint on hover */}
        {expandable && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-[8px] font-black uppercase tracking-widest text-white bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm">
              Click to expand
            </span>
          </div>
        )}
      </div>

      {/* Expand Modal */}
      {expanded && (
        <CardExpandModal
          card={card}
          onClose={() => setExpanded(false)}
          onToggleLock={onToggleLock}
          onToggleWishlist={onToggleWishlist}
          isWishlisted={isWishlisted}
        />
      )}
    </>
  );
}

