import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Coins, Gem, Check, Lock, Image as ImageIcon, UserCircle, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  item_type: string;
  image_url: string;
  cost_gold: number | null;
  cost_gems: number | null;
  [key: string]: any;
}

interface ShopSectionProps {
  shopItems: ShopItem[];
  profile: any;
  userCosmetics: any[];
  onBuyItem: (item: ShopItem) => void;
}

export function ShopSection({ shopItems, profile, userCosmetics, onBuyItem }: ShopSectionProps) {
  const ownedItemIds = useMemo(() => new Set(userCosmetics.map(c => c.item_id)), [userCosmetics]);

  const banners = useMemo(() => shopItems.filter(i => i.item_type === 'banner'), [shopItems]);
  const cardBacks = useMemo(() => shopItems.filter(i => i.item_type === 'card_back'), [shopItems]);
  const icons = useMemo(() => shopItems.filter(i => i.item_type === 'avatar'), [shopItems]);

  const renderItem = (item: ShopItem, aspectClass: string) => {
    const isOwned = ownedItemIds.has(item.id);
    const isFree = (item.cost_gold === 0 || item.cost_gold === null) && (item.cost_gems === 0 || item.cost_gems === null);
    const canAfford = isFree || (item.cost_gold
      ? (profile?.gold_balance ?? 0) >= item.cost_gold
      : (profile?.gem_balance ?? 0) >= (item.cost_gems ?? 0));

    return (
      <motion.div
        key={item.id}
        whileHover={!isOwned ? { y: -4 } : {}}
        className={cn(
          "bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-3 shadow-[4px_4px_0px_0px_var(--border)] flex flex-col gap-3 transition-all",
          isOwned && "opacity-75 grayscale-[0.5]"
        )}
      >
        <div className={cn(
          "relative rounded-xl overflow-hidden border-2 border-[var(--border)] bg-slate-100 group",
          aspectClass
        )}>
          <img 
            src={item.image_url} 
            alt={item.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              !isOwned && "group-hover:scale-110"
            )}
            referrerPolicy="no-referrer"
          />
          
          {isOwned && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
              <div className="bg-emerald-500 text-white p-2 rounded-full border-2 border-white shadow-lg">
                <Check className="w-6 h-6" />
              </div>
            </div>
          )}

          {!isOwned && !canAfford && (
            <div className="absolute top-2 right-2">
              <div className="bg-red-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg">
                <Lock className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h4 className="font-black text-xs uppercase text-[var(--text)]">{item.name}</h4>
          {item.description && (
            <p className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5 break-words whitespace-normal line-clamp-none">
              {item.description}
              {item.author && <span className="block font-black text-slate-400 mt-0.5">By {item.author}</span>}
            </p>
          )}
          
          {!isOwned ? (
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1 font-black text-sm">
                {isFree ? (
                  <span className="text-emerald-600">Free</span>
                ) : item.cost_gems && item.cost_gems > 0 ? (
                  <>
                    <Gem className="w-3 h-3 text-emerald-500" />
                    <span className={cn(!canAfford && "text-red-500")}>{item.cost_gems.toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className={cn(!canAfford && "text-red-500")}>{(item.cost_gold ?? 0).toLocaleString()}</span>
                  </>
                )}
              </div>
              
              <button
                onClick={() => onBuyItem(item)}
                disabled={!canAfford}
                className={cn(
                  "px-3 py-1 font-black rounded-lg border-2 border-black text-[10px] uppercase transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_black] active:shadow-none",
                  canAfford 
                    ? "bg-yellow-400 hover:bg-yellow-500 text-black" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none translate-y-0.5"
                )}
              >
                {isFree ? "Get Free" : !canAfford ? "Locked" : "Buy"}
              </button>
            </div>
          ) : (
            <div className="mt-1 py-1 bg-emerald-50 text-emerald-600 border-2 border-emerald-100 rounded-lg text-[10px] font-black uppercase text-center">
              Owned
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Banners Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-4 border-[var(--border)] pb-2">
          <ImageIcon className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text)]">Profile Banners</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map(item => renderItem(item, "aspect-[3/1]"))}
          {banners.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 font-bold uppercase italic">No banners available</p>}
        </div>
      </section>

      {/* Card Backs Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-4 border-[var(--border)] pb-2">
          <CreditCard className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text)]">Card Backs</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {cardBacks.map(item => renderItem(item, "aspect-[3/4]"))}
          {cardBacks.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 font-bold uppercase italic">No card backs available</p>}
        </div>
      </section>

      {/* Profile Icons Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-4 border-[var(--border)] pb-2">
          <UserCircle className="w-6 h-6 text-emerald-500" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text)]">Profile Icons</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
          {icons.map(item => renderItem(item, "aspect-square rounded-full"))}
          {icons.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 font-bold uppercase italic">No icons available</p>}
        </div>
      </section>
    </div>
  );
}
