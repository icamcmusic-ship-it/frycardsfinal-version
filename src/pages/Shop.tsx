import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, ShoppingBag, Zap, Shirt } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Shop() {
  const { profile } = useProfileStore();
  const [items, setItems] = useState<any[]>([]);
  const [userCosmetics, setUserCosmetics] = useState<any[]>([]);
  const [useGems, setUseGems] = useState(false);

  useEffect(() => {
    fetchShopItems();
    fetchUserCosmetics();
  }, []);

  const fetchShopItems = async () => {
    const { data, error } = await supabase.from('shop_items').select('*');
    if (error) console.error('Error fetching shop items:', error);
    else setItems(data || []);
  };

  const fetchUserCosmetics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_cosmetics');
      if (error) throw error;
      setUserCosmetics(data || []);
    } catch (err) {
      console.error('Error fetching user cosmetics:', err);
    }
  };

  const handleBuy = async (itemId: string) => {
    if (!confirm('Are you sure you want to buy this item?')) return;
    try {
      const { error } = await supabase.rpc('buy_shop_item', { p_item_id: itemId, p_use_gems: useGems });
      if (error) throw error;
      alert('Item purchased!');
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to buy item');
    }
  };

  const handleEquip = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('equip_item', { p_item_id: itemId });
      if (error) throw error;
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to equip item');
    }
  };

  const handleUnequip = async (itemType: string) => {
    try {
      const { error } = await supabase.rpc('unequip_cosmetic_type', { p_item_type: itemType });
      if (error) throw error;
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to unequip item');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Cosmetic Shop</h1>
      <div className="flex items-center gap-4 bg-white p-4 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <span className="font-black">Pay with:</span>
        <button onClick={() => setUseGems(false)} className={cn("px-4 py-2 rounded-lg font-black border-2 border-black", !useGems ? "bg-yellow-400" : "bg-gray-100")}>Gold</button>
        <button onClick={() => setUseGems(true)} className={cn("px-4 py-2 rounded-lg font-black border-2 border-black", useGems ? "bg-emerald-400" : "bg-gray-100")}>Gems</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const isOwned = userCosmetics.find(c => c.item_id === item.id);
          const isEquipped = isOwned?.is_equipped;
          return (
            <div key={item.id} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
              <div className="w-full aspect-square bg-gray-100 rounded-xl border-4 border-black overflow-hidden">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-16 h-16 text-slate-400" /></div>
                }
              </div>
              <h3 className="text-xl font-black text-black uppercase">{item.name}</h3>
              <p className="text-sm font-bold text-slate-600">{item.item_type?.replace('_', ' ').toUpperCase()}</p>
              <div className="flex-1" />
              {isOwned ? (
                <button 
                  onClick={() => isEquipped ? handleUnequip(item.item_type) : handleEquip(item.id)}
                  className={cn("w-full py-2 font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", isEquipped ? "bg-red-400" : "bg-green-400")}
                >
                  {isEquipped ? 'Unequip' : 'Equip'}
                </button>
              ) : (
                <button 
                  onClick={() => handleBuy(item.id)}
                  className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Buy ({useGems ? item.price_gems : item.price_gold} {useGems ? 'Gems' : 'Gold'})
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
