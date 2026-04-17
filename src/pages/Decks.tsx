import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Plus, Search, LayoutGrid, Trash2, Edit2, Save, X, Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { CardDisplay } from '../components/CardDisplay';

export function Decks() {
  const { profile } = useProfileStore();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [deckName, setDeckName] = useState('');
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [collection, setCollection] = useState<any[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const DECK_LIMIT = 30;

  useEffect(() => {
    if (profile) {
      fetchDecks();
    }
  }, [profile]);

  const fetchDecks = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_decks_with_cards');
      if (error) throw error;
      setDecks(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollection = async () => {
    if (!profile) return;
    setLoadingCollection(true);
    try {
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile.id,
        p_limit: 1000,
        p_offset: 0,
        p_sort_by: 'rarity'
      });
      if (error) throw error;
      setCollection(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCollection(true); // Wait, should be false
      setLoadingCollection(false);
    }
  };

  const handleCreateDeck = () => {
    setEditingDeck({ id: 'new' });
    setDeckName('New Deck');
    setSelectedCards([]);
    fetchCollection();
  };

  const handleEditDeck = (deck: any) => {
    setEditingDeck(deck);
    setDeckName(deck.name);
    // deck.cards is an array of card objects with quantity
    // we need to expand it or handle it as is.
    // Assuming deck.cards is normalized list
    setSelectedCards(deck.cards || []);
    fetchCollection();
  };

  const handleSaveDeck = async () => {
    if (!deckName.trim()) {
      toast.error('Deck name is required');
      return;
    }
    if (selectedCards.length < DECK_LIMIT) {
       toast.error(`Deck must have exactly ${DECK_LIMIT} cards. Current: ${selectedCards.length}`);
       return;
    }

    try {
      const cardIds = selectedCards.map(c => c.id);
      if (editingDeck.id === 'new') {
        const { error } = await supabase.rpc('create_deck', {
          p_name: deckName,
          p_card_ids: cardIds
        });
        if (error) throw error;
        toast.success('Deck created!');
      } else {
        const { error } = await supabase.rpc('update_deck', {
          p_deck_id: editingDeck.id,
          p_name: deckName,
          p_card_ids: cardIds
        });
        if (error) throw error;
        toast.success('Deck updated!');
      }
      setEditingDeck(null);
      fetchDecks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save deck');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
     if (!confirm('Are you sure you want to delete this deck?')) return;
     try {
       const { error } = await supabase.from('decks').delete().eq('id', deckId);
       if (error) throw error;
       toast.success('Deck deleted');
       fetchDecks();
     } catch (err: any) {
       toast.error(err.message || 'Failed to delete');
     }
  };

  const toggleCardInDeck = (card: any) => {
    const isAlreadyIn = selectedCards.some(c => c.id === card.id);
    const countInDeck = selectedCards.filter(c => c.id === card.id).length;
    
    // Limits: Max 3 of same ID, unless otherwise specified
    if (countInDeck >= 4) {
      toast.error('Maximum 4 copies of a card per deck');
      return;
    }

    if (selectedCards.length >= DECK_LIMIT) {
       toast.error(`Deck is full (${DECK_LIMIT} cards)`);
       return;
    }

    setSelectedCards(prev => [...prev, card]);
  };

  const removeCardFromDeck = (cardId: string) => {
    const index = selectedCards.findIndex(c => c.id === cardId);
    if (index > -1) {
      const next = [...selectedCards];
      next.splice(index, 1);
      setSelectedCards(next);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (editingDeck) {
    return (
      <div className="space-y-6 pb-20">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <button onClick={() => setEditingDeck(null)} className="p-2 hover:bg-slate-100 rounded-xl border-4 border-black transition-colors">
                  <X className="w-6 h-6" />
               </button>
               <div>
                  <h1 className="text-3xl font-black uppercase text-[var(--text)] tracking-tight">Builder</h1>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedCards.length} / {DECK_LIMIT} Cards</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Deck Name..."
                className="px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_var(--border)] uppercase"
              />
              <button 
                onClick={handleSaveDeck}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Deck
              </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Collection / Picker */}
            <div className="lg:col-span-3 space-y-6">
               <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search collection..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                     {collection
                       .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                       .map(card => {
                         const countInDeck = selectedCards.filter(c => c.id === card.id).length;
                         const remainingInCollection = (card.quantity || 1) - countInDeck;

                         return (
                           <div key={card.id} className="relative group">
                              <div 
                                onClick={() => remainingInCollection > 0 && toggleCardInDeck(card)}
                                className={cn(
                                  "cursor-pointer transition-transform hover:scale-105 active:scale-95",
                                  remainingInCollection <= 0 && "opacity-40 grayscale pointer-events-none"
                                )}
                              >
                                <CardDisplay card={card} showQuantity={false} />
                              </div>
                              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none">
                                {countInDeck > 0 && (
                                  <div className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    IN DECK: {countInDeck}
                                  </div>
                                )}
                                <div className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                  OWNED: {card.quantity || 1}
                                </div>
                              </div>
                           </div>
                         );
                       })}
                  </div>
               </div>
            </div>

            {/* Deck List Sidebar */}
            <div className="space-y-6 sticky top-24 h-fit max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-hide">
               <div className="bg-slate-900 border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
                  <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                     <LayoutGrid className="w-5 h-5" />
                     Deck Contents
                  </h3>
                  
                  <div className="space-y-2">
                     {(Array.from(new Set(selectedCards.map(c => c.id))) as string[]).map(cardId => {
                        const card = selectedCards.find(c => c.id === cardId);
                        const count = selectedCards.filter(c => c.id === cardId).length;
                        return (
                          <div key={cardId} className="flex items-center justify-between p-2 bg-white/10 rounded-xl border border-white/20 group">
                             <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/40 shrink-0">
                                   <img src={card.image_url} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-black uppercase truncate">{card.name}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-black opacity-60">x{count}</span>
                                <button 
                                  onClick={() => removeCardFromDeck(cardId)}
                                  className="p-1 hover:bg-red-500 rounded-lg transition-colors"
                                >
                                   <X className="w-3 h-3" />
                                </button>
                             </div>
                          </div>
                        );
                     })}
                     {selectedCards.length === 0 && (
                        <p className="text-center py-12 text-slate-500 font-bold uppercase text-xs">Deck is Empty</p>
                     )}
                  </div>

                  {selectedCards.length === DECK_LIMIT && (
                    <div className="mt-6 p-4 bg-green-500/20 border-2 border-green-500 rounded-xl flex items-center gap-3">
                       <CheckCircle className="w-5 h-5 text-green-400" />
                       <p className="text-xs font-black uppercase text-green-400">Deck Ready for Battle!</p>
                    </div>
                  )}
               </div>

               <div className="bg-orange-50 border-4 border-orange-200 rounded-2x p-6 text-orange-900 hidden">
                  <h4 className="font-black uppercase text-xs mb-2 flex items-center gap-2">
                     <Info className="w-4 h-4" />
                     Format Rules
                  </h4>
                  <ul className="text-[10px] font-bold space-y-1 opacity-70">
                     <li>- Exactly 30 cards</li>
                     <li>- Max 4 copies of any card</li>
                     <li>- At least 10 Unit cards</li>
                  </ul>
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Your Decks</h1>
          <p className="text-slate-600 font-bold mt-1">{decks.length} built strategies</p>
        </div>
        
        <button 
          onClick={handleCreateDeck}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 uppercase"
        >
          <Plus className="w-5 h-5" />
          Create New Deck
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {decks.map((deck) => (
          <motion.div 
            key={deck.id}
            whileHover={{ y: -4, rotate: -1 }}
            className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden relative group shadow-[8px_8px_0px_0px_var(--border)] flex flex-col h-[320px]"
          >
            {/* Deck Cover / Banner */}
            <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
               <div className="flex -space-x-8 group-hover:-space-x-4 transition-all duration-500">
                  {deck.cards?.slice(0, 3).map((card: any, i: number) => (
                    <div key={i} className="w-16 h-20 bg-white rounded-lg border-2 border-black shadow-lg overflow-hidden transform group-hover:rotate-[5deg] origin-bottom transition-all">
                       <img src={card.image_url} className="w-full h-full object-cover" />
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4">
                 <div>
                    <h3 className="text-xl font-black text-[var(--text)] uppercase">{deck.name}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{deck.cards?.length || 0} / {DECK_LIMIT} Cards</p>
                 </div>
                 {deck.cards?.length < DECK_LIMIT && (
                   <div className="bg-red-100 text-red-500 p-1.5 rounded-lg border-2 border-red-200" title="Incomplete Deck">
                      <AlertCircle className="w-4 h-4" />
                   </div>
                 )}
              </div>

              <div className="mt-auto flex gap-2">
                 <button 
                   onClick={() => handleEditDeck(deck)}
                   className="flex-[2] py-2 bg-[var(--bg)] hover:bg-slate-50 text-[var(--text)] font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 uppercase text-xs"
                 >
                    <Edit2 className="w-4 h-4" />
                    Edit
                 </button>
                 <button 
                   onClick={() => handleDeleteDeck(deck.id)}
                   className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-500 font-black rounded-lg border-2 border-red-200 transition-colors uppercase text-xs flex items-center justify-center"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Empty Deck Overlay */}
            {(!deck.cards || deck.cards.length === 0) && (
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] pointer-events-none flex items-center justify-center">
                 <p className="font-black text-slate-400 rotate-12 text-sm uppercase border-2 border-slate-300 px-4 py-2 rounded-xl">Empty Strategy</p>
              </div>
            )}
          </motion.div>
        ))}

        {decks.length === 0 && !loading && (
          <div className="col-span-full">
             <div className="text-center py-20 bg-[var(--surface)] border-4 border-dashed border-[var(--border)] rounded-3xl">
                <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-2xl font-black uppercase text-slate-400">No Decks Found</h3>
                <p className="text-slate-500 font-bold mb-8">Start your journey by creating your first battle strategy!</p>
                <button 
                  onClick={handleCreateDeck}
                  className="px-8 py-3 bg-blue-500 text-white font-black rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase"
                >
                  Create Deck
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
