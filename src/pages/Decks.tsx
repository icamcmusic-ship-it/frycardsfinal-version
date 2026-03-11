import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardDisplay } from '../components/CardDisplay';
import { cn } from '../lib/utils';

export function Decks() {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeck, setEditingDeck] = useState<any | null>(null);
  const [deckName, setDeckName] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [collection, setCollection] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchDecks(), fetchCollection()]);
    setLoading(false);
  };

  const fetchDecks = async () => {
    const { data, error } = await supabase.rpc('get_user_decks_with_cards');
    if (error) {
      console.error('Error fetching decks:', error);
      return;
    }
    setDecks(data || []);
  };

  const fetchCollection = async () => {
    const { data, error } = await supabase.rpc('get_user_collection');
    if (error) {
      console.error('Error fetching collection:', error);
      return;
    }
    setCollection(data || []);
  };

  const handleCreateDeck = async () => {
    if (!deckName.trim()) {
      toast.error('Deck name is required');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('create_deck', {
        p_name: deckName,
        p_card_ids: selectedCards,
        p_leader_id: leaderId
      });
      if (error) throw error;
      toast.success('Deck created!');
      setEditingDeck(null);
      fetchDecks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deck');
    }
  };

  const handleUpdateDeck = async () => {
    if (!deckName.trim()) {
      toast.error('Deck name is required');
      return;
    }
    try {
      const { error } = await supabase.rpc('update_deck', {
        p_deck_id: editingDeck.id,
        p_name: deckName,
        p_card_ids: selectedCards,
        p_leader_id: leaderId
      });
      if (error) throw error;
      toast.success('Deck updated!');
      setEditingDeck(null);
      fetchDecks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update deck');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      const { error } = await supabase.rpc('delete_deck', {
        p_deck_id: deckId
      });
      if (error) throw error;
      toast.success('Deck deleted!');
      fetchDecks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete deck');
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  if (editingDeck !== null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black uppercase text-[var(--text)]">{editingDeck.id ? 'Edit Deck' : 'New Deck'}</h1>
          <div className="flex gap-2 items-center">
            <div className={cn(
              "px-3 py-1.5 rounded-lg border-2 font-black text-sm",
              selectedCards.length === 20 ? "bg-green-400 text-black border-green-600" : "bg-yellow-400 text-black border-yellow-600"
            )}>
              {selectedCards.length}/20
            </div>
            <button onClick={() => setEditingDeck(null)} className="px-4 py-2 bg-[var(--bg)] text-[var(--text)] font-black rounded-xl border-2 border-[var(--border)] flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={editingDeck.id ? handleUpdateDeck : handleCreateDeck} 
              disabled={selectedCards.length !== 20}
              className="px-4 py-2 bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl border-2 border-[var(--border)] flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Deck
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <input 
            type="text" 
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            placeholder="Deck Name"
            className="flex-1 px-4 py-3 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl font-bold text-[var(--text)]"
          />
        </div>

        <div>
          <h2 className="text-xl font-black uppercase mb-4 text-[var(--text)]">Select Cards ({selectedCards.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {collection.map(card => {
              const isSelected = selectedCards.includes(card.id);
              return (
                <div 
                  key={card.id} 
                  onClick={() => toggleCardSelection(card.id)}
                  className={cn(
                    "cursor-pointer transition-transform active:scale-95 rounded-xl border-4",
                    isSelected ? "border-blue-500 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "border-transparent"
                  )}
                >
                  <CardDisplay card={card} showQuantity={true} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">My Decks</h1>
        <button 
          onClick={() => {
            setEditingDeck({});
            setDeckName('');
            setSelectedCards([]);
            setLeaderId(null);
          }}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[8px_8px_0px_0px_var(--border)]">
          <h3 className="text-2xl font-black mb-2 uppercase text-[var(--text)]">No Decks Yet</h3>
          <p className="text-slate-500 font-bold">Create your first deck to start battling!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => (
            <div key={deck.id} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-black uppercase truncate text-[var(--text)]">{deck.name}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingDeck(deck);
                      setDeckName(deck.name);
                      setSelectedCards(deck.cards?.map((c: any) => c.id) || []);
                      setLeaderId(deck.leader_id);
                    }}
                    className="p-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg border-2 border-[var(--border)]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDeck(deck.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg border-2 border-[var(--border)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-slate-500 font-bold mb-4">{deck.cards?.length || 0} Cards</p>
              
              <div className="flex -space-x-4 overflow-hidden py-2 mt-auto">
                {deck.cards?.slice(0, 5).map((card: any, i: number) => (
                  <div key={i} className="w-12 h-16 rounded border-2 border-[var(--border)] bg-gray-200 overflow-hidden inline-block shrink-0">
                    <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  </div>
                ))}
                {(deck.cards?.length || 0) > 5 && (
                  <div className="w-12 h-16 rounded border-2 border-[var(--border)] bg-gray-100 flex items-center justify-center font-black text-xs shrink-0 z-10">
                    +{deck.cards.length - 5}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
