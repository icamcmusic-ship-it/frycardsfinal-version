import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid } from 'lucide-react';
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
      setCards(data || []);
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
      const { data, error } = await supabase.functions.invoke('quicksell-card', {
        body: { card_id: cardId, is_foil: isFoil, quantity: 1 }
      });
      if (error) throw error;
      
      fetchCollection(); // Refresh
    } catch (err: any) {
      alert(err.message || 'Failed to quicksell');
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Collection</h1>
          <p className="text-slate-400 mt-1">{cards.length} cards collected</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-64 transition-all"
            />
          </div>
          
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
            <option value="divine">Divine</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredCards.map((card) => (
          <motion.div 
            key={card.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "aspect-[2.5/3.5] rounded-xl p-3 relative overflow-hidden flex flex-col justify-between border-2 group transition-transform hover:scale-105 hover:z-10 cursor-pointer",
              card.rarity === 'Legendary' ? 'bg-gradient-to-br from-yellow-900 to-amber-900 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
              card.rarity === 'Epic' ? 'bg-gradient-to-br from-purple-900 to-fuchsia-900 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' :
              card.rarity === 'Rare' ? 'bg-gradient-to-br from-blue-900 to-cyan-900 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' :
              'bg-slate-800 border-slate-600'
            )}
          >
            {card.is_foil && (
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
            )}
            
            <div className="flex justify-between items-start z-10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/70 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {card.rarity}
              </div>
              <div className="flex gap-1">
                {card.quantity > 1 && (
                  <div className="text-[10px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded-full">
                    x{card.quantity}
                  </div>
                )}
                {card.is_foil && (
                  <div className="text-[10px] font-bold text-yellow-900 bg-yellow-400 px-1.5 py-0.5 rounded-full flex items-center">
                    <Zap className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center z-10">
              <div className="w-16 h-16 mx-auto bg-black/30 rounded-full mb-2" />
              <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">{card.name}</h3>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); handleToggleLock(card.id); }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title={card.is_locked ? "Unlock" : "Lock"}
              >
                {card.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
              
              {!card.is_locked && card.quantity > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleQuicksell(card.card_id, card.is_foil); }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-medium rounded-lg border border-red-500/30 transition-colors"
                >
                  Quicksell Extra
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredCards.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No cards found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
