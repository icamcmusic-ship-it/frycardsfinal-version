import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRightLeft, Check, X, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Trades() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_user_trades');
    setTrades(data || []);
    setLoading(false);
  };

  const respondTrade = async (offerId: string, accept: boolean) => {
    await supabase.rpc('respond_to_trade_offer', { p_offer_id: offerId, p_accept: accept });
    fetchTrades();
  };

  const cancelTrade = async (offerId: string) => {
    await supabase.rpc('cancel_trade', { p_offer_id: offerId });
    fetchTrades();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Trades</h1>
      <div className="grid gap-6">
        {trades.map(trade => (
          <div key={trade.id} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
            <div>
              <p className="font-black text-lg uppercase">{trade.sender_username} ↔ {trade.receiver_username}</p>
              <p className="text-sm font-bold text-slate-500">Status: {trade.status}</p>
            </div>
            <div className="flex gap-2">
              {trade.status === 'pending' && (
                <>
                  <button onClick={() => respondTrade(trade.id, true)} className="p-3 bg-green-400 rounded-xl border-2 border-black"><Check /></button>
                  <button onClick={() => respondTrade(trade.id, false)} className="p-3 bg-red-400 rounded-xl border-2 border-black"><X /></button>
                </>
              )}
              <button onClick={() => cancelTrade(trade.id)} className="p-3 bg-slate-200 rounded-xl border-2 border-black"><Trash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
