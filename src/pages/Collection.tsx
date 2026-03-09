import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid, Coins, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Collection() {
  const { profile } = useProfileStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (profile) {
      fetchCollection();
    }
  }, [profile]);

  const fetchCollection = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile?.id,
        p_sort_by: 'rarity',
        p_limit: 100,
        p_offset: 0
      });
      if (error) throw error;
      
      const fetchedCards = data || [];
      setCards(fetchedCards);

      // Mark unseen cards as seen
      const unseenCardIds = fetchedCards.filter((c: any) => !c.is_seen).map((c: any) => c.id);
      if (unseenCardIds.length > 0) {
        await supabase.rpc('mark_cards_seen', { card_ids: unseenCardIds });
      }
    } catch (err) {
      console.error('Error fetching collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (userCardId: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_card_lock', {
        p_user_card_id: userCardId
      });
      if (error) throw error;
      
      setCards(cards.map(c => 
        c.id === userCardId ? { ...c, is_locked: !c.is_locked } : c
      ));
    } catch (err) {
      console.error('Error toggling lock:', err);
    }
  };

  const handleQuicksell = async (cardId: string, isFoil: boolean) => {
    if (!confirm('Are you sure you want to quicksell this card?')) return;
    
    try {
      const { data, error } = await supabase.rpc('quicksell_card', {
        p_card_id: cardId,
        p_quantity: 1,
        p_is_foil: isFoil
      });
      if (error) throw error;
      
      fetchCollection(); // Refresh
      
      // Also refresh profile to update gold balance in header
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile?.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to quicksell');
    }
  };

  const handleBulkMill = async () => {
    if (!confirm('Are you sure you want to quicksell ALL duplicate cards? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase.rpc('mill_bulk_duplicates');
      if (error) throw error;
      
      fetchCollection(); // Refresh
      
      // Also refresh profile to update gold balance in header
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile?.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
      
      alert('Successfully quicksold all duplicates!');
    } catch (err: any) {
      alert(err.message || 'Failed to bulk quicksell');
    }
  };

  const filteredCards = cards.filter(c => {
    if (filter !== 'all' && c.rarity.toLowerCase() !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">Collection</h1>
          <p className="text-slate-600 font-bold mt-1">{cards.length} cards collected</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleBulkMill}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
          >
            <Coins className="w-5 h-5" />
            Sell All Dupes
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-48 pl-10 pr-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="mythic">Mythic</option>
              <option value="divine">Divine</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredCards.map((card) => (
          <motion.div 
            key={card.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, rotate: -2 }}
            className={cn(
              "aspect-[2.5/3.5] rounded-xl p-4 relative overflow-hidden flex flex-col justify-between border-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group cursor-pointer bg-white transition-transform",
              card.rarity === 'Divine' ? 'border-yellow-400 bg-yellow-50' :
              card.rarity === 'Mythic' ? 'border-purple-500 bg-purple-50' :
              card.rarity === 'Rare' ? 'border-blue-500 bg-blue-50' :
              'border-black'
            )}
          >
            {card.is_foil && (
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent animate-[shimmer_2s_infinite] pointer-events-none z-20" />
            )}
            
            <div className="flex justify-between items-start z-10">
              <div className="text-xs font-black uppercase tracking-wider text-black bg-white border-2 border-black px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {card.rarity}
              </div>
              <div className="flex gap-1">
                {card.quantity > 1 && (
                  <div className="bg-black text-white text-xs font-black px-2 py-1 rounded-lg border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    x{card.quantity}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center z-10">
              <div className="w-full aspect-[3/4] mx-auto bg-gray-200 border-4 border-black rounded-lg mb-3 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] overflow-hidden">
                <img 
                  src={card.image_url} 
                  alt={card.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/card-back/200/300')}
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-black text-black text-sm leading-tight uppercase line-clamp-2">{card.name}</h3>
            </div>

            {card.is_foil && (
              <div className="absolute top-2 right-12 z-10">
                <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" />
              </div>
            )}

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-30">
              <button 
                onClick={(e) => { e.stopPropagation(); handleToggleLock(card.id); }}
                className="p-3 bg-white hover:bg-gray-200 text-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                title={card.is_locked ? "Unlock" : "Lock"}
              >
                {card.is_locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </button>
              
              {!card.is_locked && card.quantity > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleQuicksell(card.card_id, card.is_foil); }}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-sm rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  Sell Dupes
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredCards.length === 0 && (
        <div className="text-center py-20 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-black">
            <LayoutGrid className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-black mb-2 uppercase">No cards found</h3>
          <p className="text-slate-600 font-bold">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
