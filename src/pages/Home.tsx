import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Trophy, Gift, Zap, PackageOpen, LayoutGrid, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export function Home() {
  const { profile } = useProfileStore();
  const [claiming, setClaiming] = useState(false);

  const handleDailyReward = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-daily-reward');
      if (error) throw error;
      alert('Daily reward claimed!');
    } catch (err: any) {
      alert(err.message || 'Failed to claim daily reward');
    } finally {
      setClaiming(false);
    }
  };

  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-blue-400 border-4 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-yellow-300 rounded-full border-4 border-black opacity-50" />
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight uppercase">
            Welcome back, <br/><span className="text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">{profile.username || 'Duelist'}</span>
          </h1>
          <p className="text-xl text-black font-bold mb-8 bg-white/50 inline-block px-3 py-1 border-2 border-black rounded-lg transform -rotate-1">
            Level {profile.level} • {profile.xp} XP
          </p>

          <div className="flex flex-wrap gap-4">
            <Link 
              to="/packs"
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-lg rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
            >
              <PackageOpen className="w-6 h-6" />
              Open Packs
            </Link>
            <button 
              onClick={handleDailyReward}
              disabled={claiming}
              className="px-6 py-3 bg-white hover:bg-gray-100 text-black font-black text-lg rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 disabled:opacity-50"
            >
              <Gift className="w-6 h-6 text-red-500" />
              {claiming ? 'Claiming...' : 'Daily Reward'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-4 border-black rounded-2xl p-6 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 rounded-xl bg-yellow-300 flex items-center justify-center border-4 border-black transform -rotate-3">
            <Trophy className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-bold uppercase">Collection Score</p>
            <p className="text-3xl font-black text-black font-mono">1,240</p>
          </div>
        </div>
        
        <div className="bg-white border-4 border-black rounded-2xl p-6 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 rounded-xl bg-cyan-300 flex items-center justify-center border-4 border-black transform rotate-3">
            <LayoutGrid className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-bold uppercase">Unique Cards</p>
            <p className="text-3xl font-black text-black font-mono">142 / 500</p>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-2xl p-6 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 rounded-xl bg-purple-300 flex items-center justify-center border-4 border-black transform -rotate-3">
            <Zap className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-bold uppercase">Energy</p>
            <p className="text-3xl font-black text-black font-mono">20 / 20</p>
          </div>
        </div>
      </div>

      {/* Daily Missions Preview */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-black flex items-center gap-2 uppercase">
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Daily Missions
          </h2>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 uppercase">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 border-2 border-black rounded-xl p-4 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 border-2 border-black flex items-center justify-center">
                  <PackageOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-black text-lg">Open 5 Packs</p>
                  <div className="w-48 h-3 bg-white border-2 border-black rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-green-400 w-3/5 border-r-2 border-black" />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-black">3 / 5</p>
                <p className="text-sm text-yellow-600 font-bold mt-1 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-400 inline-block">+50 Gold</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
