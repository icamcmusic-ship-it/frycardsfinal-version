import React from 'react';
import { cn, getRarityStyles } from '../lib/utils';

interface NeoCardProps {
  card: any;
  onQuickSell: () => void;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({ card, onQuickSell, onClick }) => {
  const rarityGlow: Record<string, string> = {
    'Divine':     'border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.9),0_0_50px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,1)]',
    'Mythic':     'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.8)] hover:shadow-[0_0_35px_rgba(234,179,8,1)]',
    'Super-Rare': 'border-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.7)] hover:shadow-[0_0_24px_rgba(168,85,247,0.9)]',
    'Rare':       'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    'Uncommon':   'border-green-500',
    'Common':     'border-[var(--border)]',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative w-full aspect-[3/4] rounded-xl overflow-hidden border-4 transition-all duration-300 hover:scale-105 cursor-pointer bg-[var(--surface)]",
        rarityGlow[card.rarity] ?? rarityGlow['Common']
      )}
    >
      {/* Card Art */}
      <img 
        src={card.image_url} 
        alt={card.name} 
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy" 
      />

      {(card.rarity === 'Divine' || card.rarity === 'Mythic') && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-[foilShimmer_3s_linear_infinite]" />
      )}

      {/* Rarity Badge - Top Left */}
      <div className={cn(
        "absolute top-2 left-2 z-20 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
        getRarityStyles(card.rarity, card.is_foil)
      )}>
        {card.rarity}
      </div>

      {/* Rarity-specific hover overlay */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 p-4 flex flex-col justify-between",
        // Base overlay per rarity
        card.is_foil
          ? "bg-gradient-to-br from-black/85 via-purple-950/80 to-black/85"
          : card.rarity === 'Divine'
          ? "bg-gradient-to-br from-black/90 via-red-950/80 to-black/90"
          : card.rarity === 'Mythic'
          ? "bg-gradient-to-br from-black/90 via-yellow-950/80 to-black/90"
          : card.rarity === 'Super-Rare'
          ? "bg-gradient-to-br from-black/88 via-purple-950/75 to-black/88"
          : card.rarity === 'Rare'
          ? "bg-gradient-to-br from-black/88 via-blue-950/75 to-black/88"
          : card.rarity === 'Uncommon'
          ? "bg-gradient-to-br from-black/85 via-green-950/70 to-black/85"
          : "bg-black/80"
      )}>
        {/* Top: Name + type line */}
        <div>
          {/* Rarity-specific name styling */}
          <p className={cn(
            "font-black text-sm uppercase tracking-widest leading-tight mb-1",
            card.is_foil
              ? "bg-gradient-to-r from-pink-300 via-yellow-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
              : card.rarity === 'Divine'
              ? "text-red-300 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-[pulse_2s_ease-in-out_infinite]"
              : card.rarity === 'Mythic'
              ? "text-yellow-300 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]"
              : card.rarity === 'Super-Rare'
              ? "bg-gradient-to-r from-purple-300 via-pink-200 to-purple-300 bg-clip-text text-transparent"
              : card.rarity === 'Rare'
              ? "text-blue-200 drop-shadow-[0_0_6px_rgba(59,130,246,0.7)]"
              : "text-white"
          )}>
            {card.name}
          </p>

          {/* Rarity/type badge line */}
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            card.is_foil
              ? "text-yellow-300"
              : card.rarity === 'Divine'
              ? "text-red-400"
              : card.rarity === 'Mythic'
              ? "text-yellow-500"
              : card.rarity === 'Super-Rare'
              ? "text-purple-300"
              : card.rarity === 'Rare'
              ? "text-blue-300"
              : "text-gray-400"
          )}>
            {card.is_foil ? '✨ Foil' : card.rarity} · {card.card_type}
            {card.element ? ` · ${card.element}` : ''}
          </p>

          {/* Flavor text — rarity-specific container */}
          {card.flavor_text && (
            <div className={cn(
              "mt-3 p-2.5 rounded-lg border backdrop-blur-sm",
              card.is_foil
                ? "bg-gradient-to-r from-pink-500/10 via-yellow-500/10 to-cyan-500/10 border-yellow-300/30"
                : card.rarity === 'Divine'
                ? "bg-red-900/30 border-red-500/40"
                : card.rarity === 'Mythic'
                ? "bg-yellow-900/30 border-yellow-400/40"
                : card.rarity === 'Super-Rare'
                ? "bg-purple-900/30 border-purple-400/40"
                : card.rarity === 'Rare'
                ? "bg-blue-900/30 border-blue-400/40"
                : "bg-white/5 border-white/10"
            )}>
              {/* Rarity-specific flavor text prefix */}
              {(card.rarity === 'Divine' || card.rarity === 'Mythic') && (
                <p className={cn(
                  "text-[8px] font-black uppercase tracking-[0.2em] mb-1",
                  card.rarity === 'Divine' ? "text-red-400" : "text-yellow-400"
                )}>
                  {card.rarity === 'Divine' ? '⚡ Sacred Lore' : '✦ Ancient Wisdom'}
                </p>
              )}
              {card.is_foil && (
                <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 text-yellow-300">
                  ✨ Prismatic Lore
                </p>
              )}
              <p className={cn(
                "text-[10px] italic leading-snug",
                card.is_foil
                  ? "text-pink-100"
                  : card.rarity === 'Divine'
                  ? "text-red-100"
                  : card.rarity === 'Mythic'
                  ? "text-yellow-100"
                  : card.rarity === 'Super-Rare'
                  ? "text-purple-100"
                  : card.rarity === 'Rare'
                  ? "text-blue-100"
                  : "text-gray-200"
              )}>
                "{card.flavor_text}"
              </p>
            </div>
          )}
        </div>

        {/* Bottom: Quick sell button */}
        <button
          onClick={(e) => { e.stopPropagation(); onQuickSell(); }}
          className={cn(
            "w-full py-2 font-black rounded-lg border-2 transition-transform active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs text-white",
            card.rarity === 'Divine'
              ? "bg-red-600 hover:bg-red-500 border-red-800"
              : card.rarity === 'Mythic'
              ? "bg-yellow-600 hover:bg-yellow-500 border-yellow-800 text-black"
              : card.rarity === 'Super-Rare'
              ? "bg-purple-600 hover:bg-purple-500 border-purple-800"
              : card.rarity === 'Rare'
              ? "bg-blue-600 hover:bg-blue-500 border-blue-800"
              : "bg-emerald-500 hover:bg-emerald-600 border-black"
          )}
        >
          Quick Sell
        </button>
      </div>
    </div>
  );
};
