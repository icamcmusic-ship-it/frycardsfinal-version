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
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (itemId: string, isFoil: boolean) => {
    if (!confirm('Are you sure you want to buy this item?')) return;
    try {
      const { error } = await supabase.rpc('buy_shop_item', { p_item_id: itemId, p_is_foil: isFoil });
      if (error) throw error;
      alert('Item purchased!');
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to buy item');
    }
  };

  const handleEquip = async (itemId: string, isFoil: boolean) => {
    try {
      const { error } = await supabase.rpc('equip_item', { p_item_id: itemId, p_is_foil: isFoil });
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

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Cosmetic Shop</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const isOwned = userCosmetics.find(c => c.item_id === item.id);
          const isEquipped = isOwned?.is_equipped;
          return (
            <div key={item.id} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
              <div className="w-full aspect-square bg-gray-100 rounded-xl border-4 border-black flex items-center justify-center">
                <Shirt className="w-16 h-16 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-black uppercase">{item.name}</h3>
              <p className="text-sm font-bold text-slate-600">{item.type}</p>
              <div className="flex-1" />
              {isOwned ? (
                <button 
                  onClick={() => isEquipped ? handleUnequip(item.type) : handleEquip(item.id, false)}
                  className={cn("w-full py-2 font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", isEquipped ? "bg-red-400" : "bg-green-400")}
                >
                  {isEquipped ? 'Unequip' : 'Equip'}
                </button>
              ) : (
                <button 
                  onClick={() => handleBuy(item.id, false)}
                  className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Buy ({item.price} Gold)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
