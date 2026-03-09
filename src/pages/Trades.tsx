import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRightLeft, Check, X, Trash2, Plus, Handshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';

export function Trades() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<any[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [offeredGold, setOfferedGold] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTrades(); fetchFriends(); fetchMyCards(); }, []);

  const fetchTrades = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_user_trades');
    setTrades(data || []);
    setLoading(false);
  };

  const fetchFriends = async () => {
    const { data } = await supabase.rpc('get_friends');
    setFriends(data || []);
  };

  const fetchMyCards = async () => {
    const { data } = await supabase.rpc('get_user_collection');
    setMyCards(data || []);
  };

  const respondTrade = async (offerId: string, accept: boolean) => {
    try {
      await supabase.rpc('respond_to_trade_offer', { p_offer_id: offerId, p_accept: accept });
      fetchTrades();
      toast.success(accept ? 'Trade accepted!' : 'Trade declined!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond to trade');
    }
  };

  const cancelTrade = async (offerId: string) => {
    try {
      await supabase.rpc('cancel_trade', { p_offer_id: offerId });
      fetchTrades();
      toast.success('Trade cancelled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel trade');
    }
  };

  const submitTrade = async () => {
    if (!receiverId) { toast.error('Select a friend to trade with'); return; }
    if (offeredIds.length === 0 && offeredGold === 0) { toast.error('Offer at least one card or gold'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_trade_rpc', {
        p_receiver_id: receiverId,
        p_offered_card_ids: offeredIds,
        p_requested_card_ids: requestedIds,
        p_offered_gold: offeredGold,
        p_requested_gold: 0,
      });
      if (error) throw error;
      toast.success('Trade offer sent!');
      setShowCreate(false);
      setOfferedIds([]);
      setRequestedIds([]);
      setOfferedGold(0);
      setReceiverId('');
      fetchTrades();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create trade');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCard = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-black tracking-tight uppercase">Trades</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
          <Plus className="w-5 h-5" /> Create Trade
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <h2 className="text-xl font-black uppercase">New Trade Offer</h2>
          <select value={receiverId} onChange={e => setReceiverId(e.target.value)}
            className="w-full border-4 border-black p-3 rounded-xl font-bold">
            <option value="">— Select a friend —</option>
            {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
          </select>
          <div>
            <p className="font-black mb-2">Cards you're offering (click to select):</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {myCards.map(c => (
                <button key={c.id} onClick={() => toggleCard(c.id, offeredIds, setOfferedIds)}
                  className={cn("border-2 rounded-lg p-1 text-left", offeredIds.includes(c.id) ? "border-blue-500 bg-blue-50" : "border-gray-200")}>
                  <img src={c.image_url} alt={c.name} className="w-full aspect-[3/4] object-cover rounded" />
                  <p className="text-[10px] font-bold truncate mt-1">{c.name}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-black block mb-1">Gold to offer:</label>
            <input type="number" min={0} value={offeredGold} onChange={e => setOfferedGold(Number(e.target.value))}
              className="border-4 border-black p-3 rounded-xl font-bold w-40" />
          </div>
          <button onClick={submitTrade} disabled={submitting}
            className="w-full py-3 bg-emerald-500 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50">
            {submitting ? 'Sending...' : 'Send Trade Offer'}
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {trades.length === 0 && (
          <EmptyState 
            icon={Handshake}
            title="No active trades"
            description="Create a trade offer to start swapping cards with friends!"
            ctaText="Create Trade"
            ctaAction={() => setShowCreate(true)}
          />
        )}
        {trades.map(trade => (
          <div key={trade.id} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="font-black text-lg uppercase">{trade.sender_username} ↔ {trade.receiver_username}</p>
                <p className="text-sm font-bold text-slate-500 capitalize">Status: {trade.status}</p>
                {trade.sender_gold > 0 && <p className="text-sm font-bold text-yellow-600">+{trade.sender_gold} gold offered</p>}
              </div>
              <div className="flex gap-2">
                {trade.status === 'pending' && (
                  <>
                    <button onClick={() => respondTrade(trade.id, true)} className="p-3 bg-green-400 rounded-xl border-2 border-black"><Check /></button>
                    <button onClick={() => respondTrade(trade.id, false)} className="p-3 bg-red-400 rounded-xl border-2 border-black"><X /></button>
                  </>
                )}
                {['pending', 'cancelled'].includes(trade.status) && (
                  <button onClick={() => cancelTrade(trade.id)} className="p-3 bg-slate-200 rounded-xl border-2 border-black"><Trash2 /></button>
                )}
              </div>
            </div>
            {trade.sender_cards?.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-500 self-center">OFFERING:</span>
                {trade.sender_cards.map((c: any) => (
                  <div key={c.id} className="text-xs font-bold bg-blue-50 border border-blue-200 rounded px-2 py-1">{c.name}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
