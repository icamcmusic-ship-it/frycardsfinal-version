import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sword, Heart, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface CardTooltipProps {
  card: any;
  isVisible: boolean;
}

export function CardTooltip({ card, isVisible }: CardTooltipProps) {
  if (!card) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-4 shadow-[8px_8px_0px_0px_var(--border)] pointer-events-none"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="font-black text-lg uppercase leading-tight">{card.name}</h4>
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 border-2 border-[var(--border)] rounded-lg">
                {card.element}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
              "{card.flavor_text || 'A mysterious card from the Frycards collection.'}"
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border-2 border-red-200">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="font-black text-red-700">{card.hp || 0}</span>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-xl border-2 border-orange-200">
                <Sword className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="font-black text-orange-700">{card.attack || 0}</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-xl border-2 border-blue-200">
                <Shield className="w-4 h-4 text-blue-500 fill-blue-500" />
                <span className="font-black text-blue-700">{card.defense || 0}</span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded-xl border-2 border-yellow-200">
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-black text-yellow-700">{card.energy_cost || 0}</span>
              </div>
            </div>

            {card.abilities && card.abilities.length > 0 && (
              <div className="pt-2 border-t-2 border-[var(--border)] border-dashed">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Abilities</p>
                <div className="space-y-1">
                  {card.abilities.map((ability: any, i: number) => (
                    <div key={i} className="text-[10px] font-bold text-slate-700">
                      • {ability.name}: {ability.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-[var(--border)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
