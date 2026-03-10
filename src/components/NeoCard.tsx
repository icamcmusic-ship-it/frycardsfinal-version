import React from 'react';
import { cn, getRarityStyles } from '../lib/utils';

interface NeoCardProps {
  card: any;
  onQuickSell: () => void;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({ card, onQuickSell, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden border-4 border-[var(--border)] shadow-[6px_6px_0px_0px_var(--border)] transition-all duration-300 hover:scale-105 cursor-pointer bg-[var(--surface)]"
    >
      {/* Card Art */}
      <img 
        src={card.image_url} 
        alt={card.name} 
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy" 
      />

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
