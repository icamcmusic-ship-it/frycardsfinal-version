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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-white/10 p-8 md:p-12">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{profile.username || 'Duelist'}</span>
          </h1>
          <p className="text-lg text-slate-400 mb-8">
            Level {profile.level} • {profile.xp} XP
          </p>

          <div className="flex flex-wrap gap-4">
            <Link 
              to="/packs"
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center gap-2"
            >
              <PackageOpen className="w-5 h-5" />
              Open Packs
            </Link>
            <button 
              onClick={handleDailyReward}
              disabled={claiming}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Gift className="w-5 h-5 text-emerald-400" />
              {claiming ? 'Claiming...' : 'Daily Reward'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Collection Score</p>
            <p className="text-2xl font-bold text-white font-mono">1,240</p>
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <LayoutGrid className="w-6 h-6 text-cyan-500" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Unique Cards</p>
            <p className="text-2xl font-bold text-white font-mono">142 / 500</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <Zap className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Energy</p>
            <p className="text-2xl font-bold text-white font-mono">20 / 20</p>
          </div>
        </div>
      </div>

      {/* Daily Missions Preview */}
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Daily Missions
          </h2>
          <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <PackageOpen className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Open 5 Packs</p>
                  <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-indigo-500 w-3/5" />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-400">3 / 5</p>
                <p className="text-xs text-yellow-500 font-medium mt-1">+50 Gold</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
