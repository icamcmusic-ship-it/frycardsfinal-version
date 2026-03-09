import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, Coins, Gem, Clock, Package } from 'lucide-react';
import { cn } from '../lib/utils';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const [collection, setCollection] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [listingType, setListingType] = useState<'fixed_price' | 'auction'>('fixed_price');
  const [priceGold, setPriceGold] = useState(0);
  const [priceGems, setPriceGems] = useState(0);
  const [duration, setDuration] = useState(24);
  const [isFoil, setIsFoil] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCollection();
    }
  }, [isOpen]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_collection');
      if (error) throw error;
      setCollection(data || []);
    } catch (err) {
      console.error('Error fetching collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCard) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_market_listing_safe', {
        p_card_id: selectedCard.id,
        p_listing_type: listingType,
        p_price_gold: priceGold,
        p_price_gems: priceGems,
        p_expires_hours: duration,
        p_is_foil: isFoil
      });
      if (error) throw error;
      alert('Listing created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase">Create Listing</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>

        {!selectedCard ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {loading ? <Loader2 className="animate-spin" /> : collection.map(card => (
              <button key={card.id} onClick={() => setSelectedCard(card)} className="border-2 border-black rounded-lg p-2 hover:bg-blue-50">
                <img src={card.image_url} alt={card.name} className="w-full aspect-[3/4] object-cover rounded" />
                <p className="text-xs font-bold mt-1 truncate">{card.name}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-2 border-black p-4 rounded-xl">
              <img src={selectedCard.image_url} alt={selectedCard.name} className="w-20 h-20 object-cover rounded" />
              <div>
                <p className="font-black text-lg">{selectedCard.name}</p>
                <button onClick={() => setSelectedCard(null)} className="text-blue-500 font-bold text-sm underline">Change Card</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setListingType('fixed_price')} className={cn("p-4 border-4 rounded-xl font-black", listingType === 'fixed_price' ? "border-black bg-blue-400" : "border-gray-200")}>Fixed Price</button>
              <button onClick={() => setListingType('auction')} className={cn("p-4 border-4 rounded-xl font-black", listingType === 'auction' ? "border-black bg-blue-400" : "border-gray-200")}>Auction</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Gold" onChange={e => setPriceGold(Number(e.target.value))} className="border-4 border-black p-3 rounded-xl font-bold" />
              <input type="number" placeholder="Gems" onChange={e => setPriceGems(Number(e.target.value))} className="border-4 border-black p-3 rounded-xl font-bold" />
            </div>

            <select onChange={e => setDuration(Number(e.target.value))} className="w-full border-4 border-black p-3 rounded-xl font-bold">
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={72}>72 Hours</option>
            </select>

            <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 bg-emerald-500 text-white font-black text-xl rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {submitting ? 'Listing...' : 'Create Listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
