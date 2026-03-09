import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Lock, Unlock, Sparkles, Coins, Star } from 'lucide-react';

export function NeoCard({ 
  card, 
  activeTab, 
  handleToggleWishlist, 
  handleToggleLock, 
  handleMill 
}: any) {
  // Determine layout style based on rarity
  const isHighTier = card.rarity === 'Mythic' || card.rarity === 'Divine';
  const isMidTier = card.rarity === 'Rare' || card.rarity === 'Super-Rare';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, rotate: -1, scale: 1.02 }}
      className={cn(
        "aspect-[63/88] w-full max-w-[280px] mx-auto rounded-xl relative overflow-hidden group cursor-pointer transition-all duration-300",
        // Brutalist borders and shadows
        "border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
        card.rarity === 'Divine' ? 'border-red-500 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]' :
        card.rarity === 'Mythic' ? 'border-yellow-400 shadow-[8px_8px_0px_0px_rgba(250,204,21,1)]' :
        card.rarity === 'Super-Rare' ? 'border-purple-500' :
        card.rarity === 'Rare' ? 'border-blue-500' :
        'border-black bg-white'
      )}
    >
      {/* BACKGROUND / ARTWORK */}
      {isHighTier ? (
        /* Divine/Mythic: Full bleed artwork */
        <img 
          src={card.image_url} 
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://picsum.photos/seed/card-back/280/400'; }}
        />
      ) : (
        /* Common/Uncommon/Rare: Contained artwork with background color */
        <div className={cn("absolute inset-0 z-0", isMidTier ? "bg-slate-900" : "bg-white")}>
          <div className={cn(
            "w-full overflow-hidden border-black",
            isMidTier ? "h-[65%] border-b-4" : "h-[55%] border-b-4 m-2 rounded-lg w-[calc(100%-16px)]"
          )}>
            <img 
              src={card.image_url} 
              alt={card.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://picsum.photos/seed/card-back/280/400'; }}
            />
          </div>
        </div>
      )}

      {/* SHIMMER EFFECT - Uses the exact animation from your index.css */}
      {card.is_foil && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite] pointer-events-none z-10" />
      )}
      
      {/* CARD CONTENT LAYER */}
      <div className="relative z-20 h-full flex flex-col justify-between p-3 pointer-events-none">
        
        {/* Top Header Row - Utilizing JetBrains Mono for stats */}
        <div className="flex justify-between items-start font-mono">
          <div className={cn(
            "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            card.rarity === 'Divine' ? "bg-red-500 text-white" :
            card.rarity === 'Mythic' ? "bg-yellow-400 text-black" :
            card.rarity === 'Super-Rare' ? "bg-purple-500 text-white" :
            "bg-white text-black"
          )}>
            {card.rarity}
          </div>
          
          <div className="flex gap-1">
            {card.quantity > 1 && (
              <div className="bg-black text-white text-sm font-bold px-2 py-0.5 border-2 border-white rounded-sm shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                x{card.quantity}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Info Area */}
        <div className={cn(
          "mt-auto flex flex-col justify-end",
          isHighTier ? "h-1/3" : ""
        )}>
          {isHighTier ? (
            /* Neo-brutalist floating blocks for high rarities */
            <div className="bg-black/90 backdrop-blur-md border-t-4 border-l-4 border-r-4 border-black rounded-t-xl p-3 -mx-3 -mb-3 text-white">
              <h3 className="font-sans font-black text-xl leading-tight uppercase truncate">{card.name}</h3>
              <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{card.card_type}</p>
            </div>
          ) : (
            /* Standard brutalist text box */
            <div className={cn("p-2 text-center", isMidTier ? "text-white" : "text-black")}>
              <h3 className="font-sans font-black text-lg leading-tight uppercase line-clamp-2">{card.name}</h3>
              <p className={cn("font-mono text-[10px] font-bold uppercase tracking-wide mt-1", isMidTier ? "text-slate-300" : "text-slate-500")}>
                {card.card_type}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Foil Sparkles */}
      {card.is_foil && (
        <div className="absolute top-3 right-12 z-20">
          <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
        </div>
      )}

      {/* HOVER ACTIONS MENU (Only visible on hover) */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 z-30">
        
        {/* Info Text on Hover */}
        <div className="text-white text-center px-4 mb-2">
           <h3 className="font-sans text-xl font-black uppercase mb-1">{card.name}</h3>
           <p className="font-mono text-xs italic text-gray-400 line-clamp-3">"{card.flavor_text}"</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); handleToggleWishlist(card.id); }}
            className="p-3 bg-white hover:bg-gray-200 text-black rounded-sm border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <Star className={cn("w-6 h-6", activeTab === 'wishlist' ? "fill-yellow-400 text-yellow-500" : "text-slate-400")} />
          </button>

          {activeTab === 'collection' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleToggleLock(card.user_card_id); }}
              className="p-3 bg-white hover:bg-gray-200 text-black rounded-sm border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {card.is_locked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
            </button>
          )}
        </div>
        
        {activeTab === 'collection' && !card.is_locked && card.quantity > 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleMill(card); }}
            className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase tracking-wider rounded-sm border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 mt-2"
          >
            <Coins className="w-5 h-5" />
            Mill Extras
          </button>
        )}
      </div>
    </motion.div>
  );
}
