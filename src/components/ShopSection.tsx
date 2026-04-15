import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Coins, Gem, Filter, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  item_type: string;
  image_url: string;
  cost_gold: number;
  cost_gems: number;
  [key: string]: any;
}

interface ShopSectionProps {
  shopItems: ShopItem[];
  profile: any;
  onBuyItem: (item: ShopItem) => void;
}

const CATEGORIES = ['All', 'Avatars', 'Banners', 'Card Backs', 'Emotes', 'Other'];

export function ShopSection({ shopItems, profile, onBuyItem }: ShopSectionProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredItems = useMemo(() => {
    return shopItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.description?.toLowerCase().includes(search.toLowerCase());
      
      const itemType = item.item_type.toLowerCase().replace('_', ' ');
      const matchesCategory = activeCategory === 'All' || 
                               itemType.includes(activeCategory.toLowerCase().replace('s', ''));
      
      return matchesSearch && matchesCategory;
    });
  }, [shopItems, search, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--surface)] p-4 rounded-2xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)]">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search shop..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl border-2 font-black text-xs uppercase transition-all whitespace-nowrap",
                activeCategory === cat 
                  ? "bg-blue-500 text-white border-black shadow-[2px_2px_0px_0px_black]" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-black"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const canAfford = item.cost_gold > 0 
              ? (profile?.gold_balance ?? 0) >= item.cost_gold
              : (profile?.gem_balance ?? 0) >= item.cost_gems;
            
            const isCardBack = item.item_type === 'card_back';
            const isBanner = item.item_type === 'banner';
            const isAvatar = item.item_type === 'avatar';

            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                className={cn(
                  "bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-4 shadow-[8px_8px_0px_0px_var(--border)] flex flex-col transition-all",
                  !canAfford && "grayscale-[0.5] opacity-80"
                )}
              >
                {/* Item Preview */}
                <div className={cn(
                  "relative rounded-xl overflow-hidden border-2 border-[var(--border)] bg-slate-100 mb-4 flex items-center justify-center group",
                  isCardBack ? "aspect-[3/4]" : isBanner ? "aspect-[16/5]" : "aspect-square"
                )}>
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  {!canAfford && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-white/90 px-3 py-1 rounded-full border-2 border-black font-black text-[10px] uppercase text-red-600 shadow-[2px_2px_0px_0px_black]">
                        Insufficient Funds
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-lg uppercase leading-tight text-[var(--text)]">{item.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 border-2 border-slate-200 rounded-lg text-[8px] font-black uppercase text-slate-500 whitespace-nowrap">
                      {item.item_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-xs font-bold text-slate-500 line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 font-black text-lg">
                      {item.cost_gems > 0 ? (
                        <>
                          <Gem className="w-5 h-5 text-emerald-500" />
                          <span className={cn(!canAfford && "text-red-500")}>{item.cost_gems.toLocaleString()}</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-5 h-5 text-yellow-500" />
                          <span className={cn(!canAfford && "text-red-500")}>{item.cost_gold.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => onBuyItem(item)}
                      disabled={!canAfford}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none uppercase text-xs",
                        canAfford 
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                          : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none translate-y-1"
                      )}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Buy
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-20 bg-[var(--bg)] rounded-3xl border-4 border-dashed border-[var(--border)]">
            <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-400 uppercase">No items found</h3>
            <p className="text-slate-500 font-bold mt-2">Try adjusting your search or filters!</p>
            <button 
              onClick={() => { setSearch(''); setActiveCategory('All'); }}
              className="mt-6 px-6 py-2 bg-white border-4 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_black] hover:translate-y-1 hover:shadow-none transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
