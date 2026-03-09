import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('xp');

  useEffect(() => {
    fetchLeaderboard();
  }, [type]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_leaderboard', { p_type: type, p_limit: 50 });
    setLeaderboard(data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Leaderboard</h1>
      
      <div className="flex gap-4">
        {['xp', 'gold', 'wins'].map(t => (
          <button 
            key={t}
            onClick={() => setType(t)}
            className={cn("px-6 py-2 rounded-xl font-black border-4 border-black uppercase", type === t ? "bg-blue-400" : "bg-white")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {leaderboard.map((entry, i) => (
          <div key={entry.user_id} className="flex justify-between items-center p-4 border-b-2 border-slate-100 font-bold">
            <span className="w-8">{i + 1}</span>
            <span className="flex-1">{entry.username}</span>
            <span>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
