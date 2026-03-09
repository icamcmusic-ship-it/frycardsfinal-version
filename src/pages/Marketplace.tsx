import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Store, Clock, Coins, Gem, Search } from 'lucide-react';
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

  const handleBuy = async (listingId: string) => {
    if (!confirm('Are you sure you want to buy this listing?')) return;
    setBuying(listingId);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-buy', {
        body: { listing_id: listingId }
      });
      if (error) throw error;
      alert('Purchase successful!');
      fetchListings();
    } catch (err: any) {
      alert(err.message || 'Failed to buy listing');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Marketplace</h1>
          <p className="text-slate-400 mt-1">Buy and sell cards with other players</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Search market..."
              className="bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-64 transition-all"
            />
          </div>
          <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            Create Listing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <motion.div 
            key={listing.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex flex-col"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={cn(
                "w-16 h-24 rounded-lg flex-shrink-0 border-2",
                listing.card_rarity === 'Legendary' ? 'border-yellow-500 bg-yellow-900/20' :
                listing.card_rarity === 'Epic' ? 'border-purple-500 bg-purple-900/20' :
                listing.card_rarity === 'Rare' ? 'border-blue-500 bg-blue-900/20' :
                'border-slate-600 bg-slate-800'
              )} />
              
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {listing.card_rarity}
                </div>
                <h3 className="font-bold text-white text-sm truncate">{listing.card_name}</h3>
                <p className="text-xs text-slate-500 mt-1">Seller: {listing.seller_name || 'Unknown'}</p>
                
                {listing.type === 'auction' && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-orange-400">
                    <Clock className="w-3 h-3" />
                    <span>Ends in 2h 15m</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {listing.price_gold > 0 && (
                  <>
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-white font-mono">{listing.price_gold.toLocaleString()}</span>
                  </>
                )}
                {listing.price_gems > 0 && (
                  <>
                    <Gem className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white font-mono">{listing.price_gems.toLocaleString()}</span>
                  </>
                )}
              </div>
              
              {listing.seller_id !== profile?.id ? (
                <button 
                  onClick={() => handleBuy(listing.id)}
                  disabled={buying === listing.id}
                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {buying === listing.id && <Loader2 className="w-3 h-3 animate-spin" />}
                  {listing.type === 'auction' ? 'Bid' : 'Buy'}
                </button>
              ) : (
                <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-800 rounded-md">Your Listing</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {listings.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>The marketplace is currently empty.</p>
        </div>
      )}
    </div>
  );
}
