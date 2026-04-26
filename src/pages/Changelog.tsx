import React from 'react';
import { motion } from 'motion/react';
import { History, Zap, Sparkles, ShoppingBag, Trophy, Star } from 'lucide-react';
import { cn } from '../lib/utils';

const UPDATES = [
  {
    version: '1.2.8',
    date: '2026-04-26',
    title: 'The Social & Rare Feed Update',
    icon: Sparkles,
    color: 'text-yellow-500',
    changes: [
      'Introduced the "Rare Pulls" feed — see live Mythic and Divine pulls from the community!',
      'Implemented real-time rare pull notifications for your own account.',
      'Refactored the Global Chat system for improved performance and unread message tracking.',
      'Added Serial Number sorting and "Low Serial" filtering to the Collection page.',
      'Improved account stability by ensuring settings are consistently re-applied on login.',
      'Optimized Marketplace performance with better fetch debouncing and race condition prevention.',
      'Added offline detection banner and accessibility improvements (ARIA labels) across the UI.',
    ]
  },
  {
    version: '1.2.6',
    date: '2026-04-24',
    title: 'The Polish & Fix Update',
    icon: Star,
    color: 'text-blue-500',
    changes: [
      'Fixed Marketplace listing visibility and type-filtering issues.',
      'Corrected several Daily Mission progress triggers (Marketplace listings, Quicksells, Pack openings).',
      'Refined Card Detail modal market price lookup for improved accuracy.',
      'Fixed missing toast notifications in certain areas.',
      'Addressed Store tab initialization bug.',
      'Cleaned up Trade RPC calls with missing parameters.',
      'Improved Collection UI to correctly handle hidden actions on cards.'
    ]
  },
  {
    version: '1.2.5',
    date: '2026-04-24',
    title: 'The Stability Patch',
    icon: Star,
    color: 'text-yellow-500',
    changes: [
      'Implemented "Clear All" for notifications.',
      'Enabled real-time mission and quest progress for pack openings, marketplace listings, and purchases.',
      'Fixed a critical bug in Trading where friends\' collections were not appearing.',
      'Corrected market price lookup in the Card Detail modal.',
      'Improved Marketplace performance with a fix for stale scroll state during infinite scrolling.',
      'Refined Profile UI to better handle small screens with wrapping action buttons.',
      'Optimized card selection grid in trade view for better visibility.',
      'Removed unused server-side dependencies from the frontend bundle.'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-04-17',
    title: 'Visual Flair & Polished Unboxing',
    icon: Sparkles,
    color: 'text-yellow-500',
    changes: [
      'Implemented Crescendo Reveal Animation for pack opening—cards now reveal with dramatic timing!',
      'Added dynamic Pity Progress Bars to all pack types — Hard Pity (100 rolls) and Mythic Boost (50 rolls).',
      'Introduced God Pack (1:2000) visual and audio indicators.',
      'Added "All Foil" badges and hover effects for Collector and Legendary packs.',
      'Enhanced Card Metadata display: "Variance Hit!" and "Chase Slot" labels during reveal.'
    ]
  },
  {
    version: '1.1.5',
    date: '2026-04-15',
    title: 'The Spark Update',
    icon: Zap,
    color: 'text-indigo-500',
    changes: [
      'Introduced Pack Points & the Spark system—turn opening packs into guaranteed high-rarity cards.',
      'Refactored pack opening sequence to be sequential, fixing pity counter race conditions.',
      'Organized Store into sections: Gold Packs, Premium Boxes, and Collector Sets.',
      'Added dual-currency support for select premium items.'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-04-10',
    title: 'Marketplace & Economy Tuning',
    icon: ShoppingBag,
    color: 'text-emerald-500',
    changes: [
      'Updated Marketplace with 10% Auction Tax visibility for better transparency.',
      'Added Global Chat toggle to the layout for easier communication.'
    ]
  },
  {
    version: '1.0.5',
    date: '2026-04-05',
    title: 'Social & Trading Beta',
    icon: History,
    color: 'text-blue-500',
    changes: [
      'Launched Friends & Social features—see when your friends pull rare cards!',
      'Implemented secure Peer-to-Peer card trading.',
      'Added notification badges for pending trades and friend requests.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-04-01',
    title: 'The Grand Opening',
    icon: Trophy,
    color: 'text-red-500',
    changes: [
      'Initial release of Frycards!',
      'Core set of 300+ unique cards across 6 rarities.',
      'Quest system and Daily Objectives launched.',
      'Season Pass "Genesis" is now live.'
    ]
  }
];

export function Changelog() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <History className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Changelog</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Tracking the evolution of Frycards</p>
        </div>
      </div>

      <div className="space-y-12 relative before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-1 before:bg-slate-200">
        {UPDATES.map((update, idx) => {
          const Icon = update.icon;
          return (
            <motion.div 
              key={update.version}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-16"
            >
              {/* Timeline dot */}
              <div className={cn(
                "absolute left-0 top-0 w-12 h-12 rounded-full border-4 border-black flex items-center justify-center z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                idx === 0 ? "bg-white" : "bg-slate-50"
              )}>
                <Icon className={cn("w-6 h-6", update.color)} />
              </div>

              <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <div>
                    <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Version {update.version}</span>
                    <h3 className="text-2xl font-black uppercase text-[var(--text)]">{update.title}</h3>
                  </div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border-2 border-slate-200 w-fit">
                    {update.date}
                  </div>
                </div>

                <ul className="space-y-3">
                  {update.changes.map((change, cIdx) => (
                    <li key={cIdx} className="flex gap-3 text-slate-600 font-medium leading-relaxed">
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
