import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Sparkles, Crown, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { ClickableUsername } from '../components/ClickableUsername';
import { cn } from '../lib/utils';

export function RarePulls() {
  const [pulls, setPulls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Mythic' | 'Divine'>('all');

  const fetchFeed = async () => {
    const { data, error } = await supabase.rpc('get_rare_pulls_feed', {
      p_limit: 100,
      p_offset: 0,
      p_min_rarity: filter === 'all' ? 'Mythic' : filter,
    });
    if (!error && data) setPulls(data.pulls || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    const channel = supabase
      .channel('rare-pulls-feed')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rare_pull_announcements' },
        (payload) => setPulls(prev => [payload.new, ...prev].slice(0, 100))
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Crown className="w-10 h-10 text-yellow-500" />
        <div>
          <h1 className="text-4xl font-black uppercase">Rare Pulls Feed</h1>
          <p className="text-slate-500 font-bold">Live Mythic+ pulls from across the community</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'Mythic', 'Divine'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl font-black text-sm uppercase border-4 transition-all",
              filter === f ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_black]" :
              "bg-white text-slate-500 border-slate-200 hover:border-black"
            )}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {pulls.length === 0 ? (
          <div className="text-center py-20 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase">No pulls yet — be the first!</p>
          </div>
        ) : pulls.map(p => (
          <motion.div key={p.id}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex items-center gap-4 p-4 bg-[var(--surface)] border-4 rounded-2xl shadow-[6px_6px_0px_0px_var(--border)]",
              p.card_rarity === 'Divine' ? "border-red-500" : "border-yellow-500"
            )}>
            <img src={p.card_image_url} alt={p.card_name} className="w-16 h-22 object-cover rounded-lg border-2 border-black" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ClickableUsername userId={p.user_id} username={p.username} className="font-black text-blue-600" />
                <span className="text-sm font-bold text-slate-500">pulled</span>
                <span className={cn("text-xs font-black px-2 py-0.5 rounded border-2",
                  p.card_rarity === 'Divine' ? "bg-red-100 text-red-700 border-red-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"
                )}>
                  {p.card_rarity}
                  {p.is_foil && !p.serial_number && ' ✨ Foil'}
                  {p.serial_number && ' #' + p.serial_number}
                </span>
              </div>
              <p className="text-lg font-black uppercase text-[var(--text)]">{p.card_name}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">
                {p.source === 'pack' ? `from ${p.pack_name || 'a pack'}` :
                 p.source === 'spark' ? 'via Spark' : `via ${p.source}`}
                {p.serial_number && ` • Serial #${p.serial_number}/200`}
                {' • '}{new Date(p.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
