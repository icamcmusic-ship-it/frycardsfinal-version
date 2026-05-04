import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Zap, Coins, Gem, Sparkles, LayoutGrid, Store, ShoppingBag, Trophy, ArrowRightLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export function HowToPlay() {
  const sections = [
    {
      title: 'Energy and Stamina',
      icon: Zap,
      color: 'bg-blue-100 text-blue-600',
      content: 'Energy is required for core game actions. It regenerates slowly over time. You can increase your max energy by leveling up through pack openings and quests.'
    },
    {
      title: 'Currencies',
      icon: Coins,
      color: 'bg-yellow-100 text-yellow-600',
      description: 'The backbone of the Frycards economy.',
      items: [
        { name: 'Gold', icon: Coins, text: 'The primary currency. Earned from daily login, quests, and selling duplicates. Used for basic packs.' },
        { name: 'Gems', icon: Gem, text: 'Premium currency. Used for special event boxes, cosmetics, and seasonal content.' },
        { name: 'Pack Points', icon: Sparkles, text: 'Earned whenever you open a pack. Spend them in the Spark tab to get guaranteed high-rarity cards!' }
      ]
    },
    {
      title: 'The Store & Pity',
      icon: Store,
      color: 'bg-indigo-100 text-indigo-600',
      content: 'Opening packs is the primary way to collect cards. Every pack has a Super-Rare Pity at 50 rolls and a Mythic Pity at 100 rolls. God Packs (1:2000) contain only all-SR+ foil cards! Wildcard slots have linear scaling boosts between 50 and 100 rolls.'
    },
    {
      title: 'Marketplace & Trading',
      icon: ShoppingBag,
      color: 'bg-emerald-100 text-emerald-600',
      content: 'Trade directly with friends or list your valuable cards on the Marketplace. Note: All Marketplace sales carry a 10% Auction Tax to keep the economy stable.'
    },
    {
      title: 'Progression',
      icon: Trophy,
      color: 'bg-red-100 text-red-600',
      content: 'Complete Daily Quests and long-term Achievements to earn Gold, Gems, and Season Pass progress. The Season Pass offers exclusive rewards only available for a limited time.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <BookOpen className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">How to Play</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Master the world of Frycards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {sections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-[var(--surface)] border-4 border-[var(--border)] rounded-3xl p-8 shadow-[12px_12px_0px_0px_var(--border)] relative overflow-hidden transition-all hover:translate-y-[-4px]"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0", section.color)}>
                <section.icon className="w-8 h-8" />
              </div>
              
              <div className="flex-1 space-y-4">
                <h3 className="text-3xl font-black uppercase text-[var(--text)] italic tracking-tight">{section.title}</h3>
                {section.content && (
                  <p className="text-slate-600 font-bold text-lg leading-relaxed">
                    {section.content}
                  </p>
                )}
                
                {section.items && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {section.items.map(item => (
                      <div key={item.name} className="bg-white/50 border-2 border-[var(--border)] p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon className="w-4 h-4 text-slate-400" />
                          <h4 className="font-black text-sm uppercase">{item.name}</h4>
                        </div>
                        <p className="text-xs font-bold text-slate-500">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
          </motion.div>
        ))}
      </div>

      <div className="bg-indigo-900 border-4 border-black rounded-3xl p-10 text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="relative z-10 text-center space-y-6">
          <h3 className="text-3xl font-black uppercase">Ready to Start?</h3>
          <p className="text-indigo-200 font-bold max-w-xl mx-auto">
            Head to the store to get your first free Daily Pack and start building your collection. Every card tells a story!
          </p>
          <div className="flex justify-center pt-4">
             <Store className="w-20 h-20 text-indigo-400 rotate-12 opacity-50 absolute right-10 bottom-0" />
             <LayoutGrid className="w-24 h-24 text-indigo-400 -rotate-12 opacity-50 absolute left-8 top-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
