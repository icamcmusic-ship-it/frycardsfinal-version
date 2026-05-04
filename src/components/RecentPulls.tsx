import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function RecentPulls() {
  const [pulls, setPulls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentPulls = async () => {
    try {
      const { data, error } = await supabase.rpc('get_rare_pulls_feed', {
        p_limit: 10,
        p_offset: 0,
        p_min_rarity: 'Super-Rare'
      });
      if (!error && data) {
        setPulls(data.pulls || []);
      }
    } catch (err) {
      console.error('Error fetching recent pulls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentPulls();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (pulls.length === 0) return null;

  return (
    <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-orange-500" />
        <h2 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight">Recent Rare Pulls</h2>
      </div>

      <div className="space-y-4">
        {pulls.map((pull, idx) => (
          <motion.div
            key={pull.id || idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-3 shadow-[2px_2px_0px_0px_var(--border)]"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-black shrink-0">
              <img 
                src={pull.card_image_url} 
                alt={pull.card_name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-[var(--text)] text-sm truncate uppercase">{pull.username}</span>
                <span className={cn(
                  "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase",
                  pull.card_rarity === 'Divine' ? "bg-red-100 text-red-600 border-red-200" :
                  pull.card_rarity === 'Mythic' ? "bg-yellow-100 text-yellow-600 border-yellow-200" :
                  "bg-purple-100 text-purple-600 border-purple-200"
                )}>
                  {pull.card_rarity}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                Pulled {pull.card_name}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
