import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Store, Clock, Coins, Gem, Search, Plus, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Marketplace() {
  const { profile } = useProfileStore();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_listings', {
        limit: 50,
        offset: 0
      });
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listing: any) => {
    if (buying || !profile) return;
    
    // Check if user has enough currency (assuming gold for now based on RPC)
    if (profile.gold_balance < listing.price) {
      alert('Not enough gold!');
      return;
    }

    if (!confirm(`Buy ${listing.card.name} for ${listing.price} gold?`)) return;

    setBuying(listing.id);
    try {
      const { error } = await supabase.rpc('buy_market_listing', {
        p_listing_id: listing.id
      });

      if (error) throw error;
      
      alert('Purchase successful!');
      fetchListings();
      
      // Refresh profile to update gold balance
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to buy card');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">Marketplace</h1>
          <p className="text-slate-600 font-bold mt-1">Buy and sell cards with other players</p>
        </div>
        
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Listing
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search marketplace..."
            className="w-full pl-10 pr-4 py-3 bg-white border-4 border-black rounded-xl text-black font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select className="w-full sm:w-48 pl-10 pr-4 py-3 bg-white border-4 border-black rounded-xl text-black font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <option value="all">All Types</option>
            <option value="fixed">Buy Now</option>
            <option value="auction">Auctions</option>
          </select>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-black">
            <Store className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-black mb-2 uppercase">Market is empty</h3>
          <p className="text-slate-600 font-bold">Check back later for new listings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <motion.div 
              key={listing.id}
              whileHover={{ y: -4, rotate: -1 }}
              className={cn(
                "bg-white border-4 rounded-2xl p-4 flex flex-col gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform",
                listing.card_rarity === 'Divine' ? 'border-yellow-400' :
                listing.card_rarity === 'Mythic' ? 'border-purple-500' :
                listing.card_rarity === 'Rare' ? 'border-blue-500' :
                'border-black'
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-black bg-gray-100 border-2 border-black px-2 py-0.5 rounded-full inline-block mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {listing.card_rarity}
                  </div>
                  <h3 className="font-black text-black text-lg leading-tight uppercase">{listing.card_name}</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1">Seller: {listing.seller_name}</p>
                </div>
                {listing.is_foil && (
                  <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 text-xs font-black px-2 py-1 rounded-lg">
                    FOIL
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex items-center justify-center py-4">
                <div className="w-full aspect-[3/4] bg-gray-200 border-4 border-black rounded-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] overflow-hidden">
                  <img 
                    src={listing.card.image_url} 
                    alt={listing.card_name}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/card-back/200/300')}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-black rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">{listing.type === 'fixed' ? 'Buy Now' : 'Current Bid'}</p>
                  <div className="flex items-center gap-1 text-black font-black text-lg">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    {listing.price_gold}
                  </div>
                </div>
                {listing.type === 'auction' && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Ends In</p>
                    <div className="flex items-center gap-1 text-red-500 font-black">
                      <Clock className="w-4 h-4" />
                      2h 15m
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleBuy(listing)}
                disabled={buying === listing.id || profile?.id === listing.seller_id}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
              >
                {buying === listing.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    {listing.type === 'fixed' ? 'Buy Now' : 'Place Bid'}
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
