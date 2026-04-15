import React, { useState, useRef } from 'react';
import { cn, getRarityStyles } from '../lib/utils';
import { Sword, Shield, Heart, Sparkles, Lock, Unlock, Star, Zap, Dice5 } from 'lucide-react';

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
    author?: string;
    user_card_id?: string;
    is_locked?: boolean;
  };
  showQuantity?: boolean;
  showNewBadge?: boolean;
  className?: string;
  onToggleLock?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
  activeTab?: 'collection' | 'wishlist' | 'sets';
}

export function CardDisplay({ 
  card, 
  showQuantity = true, 
  showNewBadge = true, 
  className,
  onToggleLock,
  onToggleWishlist,
  isWishlisted,
  activeTab
}: CardDisplayProps) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const rarityBorder: Record<string, string> = {
    'Divine':     'border-red-500',
    'Mythic':     'border-yellow-400',
    'Super-Rare': 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.7)]',
    'Rare':       'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    'Uncommon':   'border-green-500',
    'Common':     'border-slate-400',
  };

  const elementBorderAccent: Record<string, string> = {
    'fire':    'shadow-[inset_0_0_0_1px_rgba(239,68,68,0.6)]',
    'neutral': 'shadow-[inset_0_0_0_1px_rgba(148,163,184,0.4)]',
    'tech':    'shadow-[inset_0_0_0_1px_rgba(6,182,212,0.6)]',
    'magical': 'shadow-[inset_0_0_0_1px_rgba(139,92,246,0.7)]',
    'nature':  'shadow-[inset_0_0_0_1px_rgba(22,163,74,0.6)]',
    'shadow':  'shadow-[inset_0_0_0_1px_rgba(88,28,135,0.7)]',
    'ice':     'shadow-[inset_0_0_0_1px_rgba(125,211,252,0.7)]',
    'void':    'shadow-[inset_0_0_0_1px_rgba(15,23,42,0.9)]',
  };

  const elementAccent = elementBorderAccent[((card as any).element || (card as any).element_type || '').toLowerCase()] ?? '';

  const RARITY_GRADIENTS: Record<string, string> = {
    Divine: 'from-red-900 to-red-600',
    Mythic: 'from-yellow-900 to-yellow-600',
    'Super-Rare': 'from-purple-900 to-purple-600',
    Rare: 'from-blue-900 to-blue-600',
    Uncommon: 'from-green-900 to-green-600',
    Common: 'from-slate-900 to-slate-600',
  };

  const border = rarityBorder[card.rarity] ?? rarityBorder['Common'];

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative w-full aspect-[3/4] rounded-xl border-4 group cursor-pointer transition-all duration-300 overflow-hidden bg-slate-950',
        border,
        elementAccent,
        className
      )}
    >
      {/* Background Art - Full Card */}
      <div className="absolute inset-0 z-0">
        {card.is_video ? (
          <video src={card.image_url} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-85" />
        ) : (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover opacity-85" referrerPolicy="no-referrer" />
        )}
        
        {/* Foil Shimmer */}
        {(card.is_foil || (card.foil_quantity ?? 0) > 0) && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 mix-blend-color-dodge opacity-30"
            style={{
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.8) 0%, transparent 50%), 
                           repeating-linear-gradient(${mousePos.x + mousePos.y}deg, 
                             rgba(255,0,0,0.1) 0%, 
                             rgba(255,255,0,0.1) 10%, 
                             rgba(0,255,0,0.1) 20%, 
                             rgba(0,255,255,0.1) 30%, 
                             rgba(0,0,255,0.1) 40%, 
                             rgba(255,0,255,0.1) 50%, 
                             rgba(255,0,0,0.1) 60%)`,
              backgroundSize: '200% 200%',
              backgroundPosition: `${mousePos.x}% ${mousePos.y}%`
            }}
          />
        )}
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col h-full p-1.5">
        {/* Card Header */}
        <div className={cn(
          "flex items-center justify-between px-1.5 py-1 rounded-t-lg border-b border-white/10 bg-gradient-to-r backdrop-blur-md",
          RARITY_GRADIENTS[card.rarity] ? RARITY_GRADIENTS[card.rarity].split(' ').map(c => c + '/30').join(' ') : 'from-slate-800/30 to-slate-600/30'
        )}>
          <div className="flex items-center gap-1 min-w-0">
            <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40 flex items-center justify-center shadow-inner shrink-0">
              <Zap className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-tight drop-shadow-md truncate">
              {card.name}
            </h3>
          </div>
          <div className="flex items-center gap-0.5 bg-black/30 px-1 py-0.5 rounded border border-white/10 shrink-0">
            <Heart className="w-2.5 h-2.5 text-red-400 fill-red-400" />
            <span className="text-white font-black text-[9px]">{card.hp || '??'}</span>
          </div>
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1 relative">
          {/* Rarity Badge - Floating in middle-right */}
          <div className="absolute bottom-2 right-0 z-30">
            <div className={cn(
              "px-1 py-0.5 rounded border border-black/30 shadow-sm flex items-center gap-0.5 backdrop-blur-sm",
              getRarityStyles(card.rarity, card.is_foil ?? false).replace(/bg-\w+-\d+/, (m) => m + '/30')
            )}>
              <Star className="w-2 h-2 fill-current" />
              <span className="text-[7px] font-black uppercase">{card.rarity}</span>
            </div>
          </div>

          {/* NEW Badge - Floating in top-left */}
          {showNewBadge && card.is_new && (
            <div className="absolute top-0 left-0 z-30 bg-yellow-400/50 text-black text-[7px] font-black px-1 py-0.5 rounded border border-black/20 shadow-sm uppercase animate-bounce backdrop-blur-sm">
              New!
            </div>
          )}
        </div>

        {/* Stats Bar */}
        {!['Event', 'Sacred'].includes(card.card_type || '') && (
          <div className="grid grid-cols-3 gap-0.5 bg-black/20 p-0.5 border-t border-white/10 backdrop-blur-sm">
            <div className="bg-orange-500/30 rounded border border-white/10 flex items-center justify-center gap-0.5 py-0.5 shadow-inner">
              <Sword className="w-2.5 h-2.5 text-white" />
              <span className="text-white font-black text-[9px]">{(card as any).attack || 0}</span>
            </div>
            <div className="bg-blue-500/30 rounded border border-white/10 flex items-center justify-center gap-0.5 py-0.5 shadow-inner">
              <Shield className="w-2.5 h-2.5 text-white" />
              <span className="text-white font-black text-[9px]">{(card as any).defense || 0}</span>
            </div>
            <div className="bg-purple-500/30 rounded border border-white/10 flex items-center justify-center gap-0.5 py-0.5 shadow-inner">
              <Dice5 className="w-2.5 h-2.5 text-white" />
              <span className="text-white font-black text-[9px]">{(card as any).dice_cost ?? 0}</span>
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="bg-white/5 p-1.5 flex flex-col border-x border-white/10 border-b border-white/10 overflow-hidden backdrop-blur-md">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <p className="text-white/90 font-black text-[9px] uppercase mb-0.5 tracking-wide truncate drop-shadow-md">
              {card.card_type}{(card as any).sub_type ? ` • ${(card as any).sub_type}` : ''}
            </p>
            <div className="h-px bg-white/10 mb-1" />
            <p className="text-white text-[9px] font-bold leading-tight mb-1 line-clamp-2 drop-shadow-sm">
              {card.ability_text || (card as any).description || "No ability text."}
            </p>
            {card.flavor_text && (
              <p className="text-white/75 text-[10px] italic leading-snug mt-0.5 line-clamp-2">
                "{card.flavor_text}"
              </p>
            )}
          </div>
        </div>

        {/* Element badge - bottom of card */}
        {(card as any).element && (
          <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5 bg-black/20 backdrop-blur-sm">
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-white/20",
              (() => {
                const elementBadgeColors: Record<string, string> = {
                  'fire':    'bg-red-900/60 text-red-200',
                  'neutral': 'bg-slate-700/60 text-slate-200',
                  'tech':    'bg-cyan-900/60 text-cyan-200',
                  'magical': 'bg-violet-900/60 text-violet-200',
                  'nature':  'bg-green-900/60 text-green-200',
                  'shadow':  'bg-purple-950/60 text-purple-200',
                  'ice':     'bg-sky-900/60 text-sky-200',
                  'void':    'bg-slate-950/60 text-slate-300',
                };
                return elementBadgeColors[(card as any).element] ?? 'bg-slate-700 text-slate-200';
              })()
            )}>
              {(card as any).element}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-1.5 py-0.5 bg-black/30 rounded-b-lg backdrop-blur-md border-t border-white/10">
          <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">
            {((card as any).element || (card as any).element_type) ? ((card as any).element || (card as any).element_type).charAt(0).toUpperCase() + ((card as any).element || (card as any).element_type).slice(1) : 'Neutral'}
          </span>
          <div className="flex gap-1">
            {onToggleLock && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                className={cn(
                  "p-0.5 rounded transition-transform active:scale-95",
                  card.is_locked ? "text-red-400" : "text-white/30 hover:text-white"
                )}
              >
                {card.is_locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
              </button>
            )}
            {onToggleWishlist && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
                className={cn(
                  "p-0.5 rounded transition-transform active:scale-95",
                  isWishlisted ? "text-yellow-400" : "text-white/30 hover:text-white"
                )}
              >
                <Star className={cn("w-2.5 h-2.5", isWishlisted && "fill-current")} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quantity badge */}
      {showQuantity && card.quantity != null && card.quantity > 1 && (
        <div className="absolute top-1 right-1 z-40 bg-black/50 text-white text-[8px] font-black px-1 py-0.5 rounded border border-white/10 backdrop-blur-sm">
          ×{card.quantity}
        </div>
      )}
    </div>
  );
}
