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

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 p-4 flex flex-col justify-center items-center text-white text-center">
        <div className="text-center mb-4">
          <p className="text-white font-black text-sm uppercase tracking-widest">{card.name}</p>
          <p className="text-gray-300 text-xs font-bold mt-1">{card.rarity} · {card.card_type}</p>
          {card.flavor_text && (
            <div className="mt-4 p-3 bg-[var(--surface)]/10 border border-[var(--border)]/20 rounded-lg backdrop-blur-sm">
              <p className="text-gray-200 text-[11px] italic leading-snug">"{card.flavor_text}"</p>
            </div>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onQuickSell();
          }}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg border-2 border-black transition-transform active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
        >
          Quick Sell
        </button>
      </div>
    </div>
  );
};
