import React from 'react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';

interface NeoCardProps {
  card: any;
  onQuickSell: () => void;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({ card, onQuickSell, onClick }) => {
  return (
    <div className="flex flex-col gap-4">
      <div 
        onClick={onClick}
        className="cursor-pointer transition-transform hover:scale-105"
      >
        <CardDisplay card={card} showQuantity={false} showNewBadge={false} />
      </div>

      {/* Bottom: Quick sell button */}
      <button
        onClick={(e) => { e.stopPropagation(); onQuickSell(); }}
        className={cn(
          "w-full py-3 font-black rounded-xl border-4 border-black transition-transform active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 uppercase tracking-wider text-sm text-white",
          card.rarity === 'Divine'
            ? "bg-red-600 hover:bg-red-500"
            : card.rarity === 'Mythic'
            ? "bg-yellow-500 hover:bg-yellow-400 text-black"
            : card.rarity === 'Super-Rare'
            ? "bg-purple-600 hover:bg-purple-500"
            : card.rarity === 'Rare'
            ? "bg-blue-600 hover:bg-blue-500"
            : "bg-emerald-500 hover:bg-emerald-600"
        )}
      >
        Quick Sell
      </button>
    </div>
  );
};
