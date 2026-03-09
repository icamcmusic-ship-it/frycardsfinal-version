import React from 'react';

interface NeoCardProps {
  card: any;
  onQuickSell: () => void;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({ card, onQuickSell, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:scale-105 cursor-pointer bg-white"
    >
      {/* Card Art */}
      <img 
        src={card.image_url} 
        alt={card.name} 
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy" 
      />

      {/* Rarity Badge */}
      <div className="absolute top-2 left-2 z-20 text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 border border-black px-1.5 py-0.5 rounded-full shadow-sm">
        {card.rarity}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 p-4 flex flex-col justify-center items-center text-white text-center">
        <div className="text-center mb-4">
          <p className="text-white font-black text-sm uppercase">{card.name}</p>
          <p className="text-gray-300 text-xs font-bold">{card.rarity} · {card.card_type}</p>
          {card.flavor_text && (
            <div className="mt-2 p-2 bg-black/40 border border-white/20 rounded-lg">
              <p className="text-gray-200 text-[11px] italic leading-snug">"{card.flavor_text}"</p>
            </div>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onQuickSell();
          }}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg border-2 border-black transition-transform active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
        >
          Quick Sell
        </button>
      </div>
    </div>
  );
};
