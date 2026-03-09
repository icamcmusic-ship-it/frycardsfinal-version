import React from 'react';

interface NeoCardProps {
  name: string;
  imageUrl: string;
  quicksellValue: number;
  onQuickSell: () => void;
  onClick?: () => void; // Optional: if you want clicking the card (not the button) to do something
}

export const NeoCard: React.FC<NeoCardProps> = ({ name, imageUrl, quicksellValue, onQuickSell, onClick }) => {
  return (
    /* 1. aspect-[63/88] maintains standard trading card proportions. 
      2. overflow-hidden ensures the image doesn't bleed past the rounded corners.
      3. 'group' allows us to trigger the child overlay on hover.
    */
    <div 
      onClick={onClick}
      className="group relative w-full aspect-[63/88] rounded-xl overflow-hidden border-2 border-gray-700/50 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-500 cursor-pointer bg-gray-900"
    >
      {/* Card Art - Fills entirely to the border */}
      <img 
        src={imageUrl} 
        alt={name} 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy" 
      />

      {/* Hover Overlay - Only shows Quicksell */}
      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevents triggering the card's main onClick event
            onQuickSell();
          }}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-transform active:scale-95 w-full max-w-[160px] shadow-lg flex items-center justify-center gap-2"
        >
          <span>Quick Sell</span>
          <span className="text-red-200 font-mono text-sm">${quicksellValue}</span>
        </button>
      </div>
    </div>
  );
};
