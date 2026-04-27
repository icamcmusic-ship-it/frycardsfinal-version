import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Trophy, Filter, Check, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';

interface SetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  set: any;
  userId: string | undefined;
}

export function SetDetailsModal({ isOpen, onClose, set, userId }: SetDetailsModalProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'owned' | 'missing'>('all');

  useEffect(() => {
    if (isOpen && set?.id) {
      fetchSetCards();
    }
  }, [isOpen, set?.id]);

  const fetchSetCards = async () => {
    setLoading(true);
    try {
      // 1. Fetch all cards in set
      const { data: allCards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', set.id)
        .order('rarity', { ascending: false })
        .order('name');

      if (cardsError) throw cardsError;

      // 2. Fetch user's cards in this set
      if (userId) {
        const { data: userCards, error: userCardsError } = await supabase
          .rpc('get_user_collection', {
            p_user_id: userId,
            p_set_id: set.id,
            p_rarity: null,
            p_sort_by: 'name',
            p_card_type_filter: null,
            p_is_foil: null,
            p_limit: 1000,
            p_offset: 0,
            p_search: null,
            p_wishlist_only: false,
            p_low_serial_only: false
          });

        if (userCardsError) throw userCardsError;

        // Map ownership
        const ownedMap = new Map();
        userCards?.forEach((uc: any) => {
          ownedMap.set(uc.id, uc);
        });

        const cardsWithOwnership = allCards.map(c => ({
          ...c,
          owned: ownedMap.has(c.id),
          quantity: ownedMap.get(c.id)?.quantity || 0,
          foil_quantity: ownedMap.get(c.id)?.foil_quantity || 0,
          is_new: ownedMap.get(c.id)?.is_new
        }));

        setCards(cardsWithOwnership);
      } else {
        setCards(allCards.map(c => ({ ...c, owned: false })));
      }
    } catch (err) {
      console.error('Error fetching set cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(c => {
    if (filter === 'owned') return c.owned;
    if (filter === 'missing') return !c.owned;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--bg)] border-4 border-[var(--border)] rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[12px_12px_0px_0px_var(--border)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-[var(--surface)] border-b-4 border-[var(--border)] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 border-4 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_black] rotate-3 text-white">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase text-[var(--text)] tracking-tight">{set.name}</h2>
              <p className="text-slate-500 font-bold uppercase text-sm">Set Collection ({set.owned_cards} / {set.total_cards})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-red-100 hover:text-red-500 rounded-full transition-colors border-2 border-transparent hover:border-red-500"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap gap-3 items-center justify-between shrink-0">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Cards' },
              { id: 'owned', label: 'Owned Only' },
              { id: 'missing', label: 'Missing Only' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl font-black uppercase text-xs border-4 transition-all",
                  filter === f.id 
                    ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_black]" 
                    : "bg-white text-slate-500 border-slate-200 hover:border-black"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-xs font-black text-slate-400 uppercase">
            Showing {filteredCards.length} Cards
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-slate-500 font-black uppercase">Scanning Archives...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredCards.map((card) => (
                <div 
                  key={card.id} 
                  className={cn(
                    "relative transition-all duration-300",
                    !card.owned && "grayscale contrast-50 opacity-40 hover:grayscale-0 hover:contrast-100 hover:opacity-100"
                  )}
                >
                  <CardDisplay 
                    card={card} 
                    showQuantity={card.owned} 
                    showNewBadge={card.is_new}
                  />
                  {!card.owned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/80 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 border-white/20">
                        Missing
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {!loading && filteredCards.length === 0 && (
            <div className="text-center py-20">
              <Shield className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase">No cards found in this category.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t-4 border-[var(--border)] text-center text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
          Card rarity affects pull rates and secondary market value
        </div>
      </motion.div>
    </div>
  );
}
