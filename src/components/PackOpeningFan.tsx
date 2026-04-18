import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import { audioService } from '../services/AudioService';

interface PackOpeningFanProps {
  isOpen: boolean;
  onClose: () => void;
  cards: any[];
  summary: { xp_gained: number, new_card_count: number } | null;
}

export function PackOpeningFan({ isOpen, onClose, cards, summary }: PackOpeningFanProps) {
  const [flippedCount, setFlippedCount] = useState(0);
  const [flippedStates, setFlippedStates] = useState<Record<number, 'idle' | 'revealing' | 'collected' | 'chase'>>({});
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [blockManualClicks, setBlockManualClicks] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const chaseIndex = useMemo(() => {
    if (cards.length === 0) return -1;
    // Find the most rare card index
    const rarityOrder = ['Divine', 'Mythic', 'Super-Rare', 'Rare', 'Uncommon', 'Common'];
    let bestIndex = cards.length - 1;
    let bestRarityIdx = rarityOrder.indexOf(cards[cards.length - 1].rarity);
    
    for (let i = 0; i < cards.length; i++) {
      const currentRarityIdx = rarityOrder.indexOf(cards[i].rarity);
      if (currentRarityIdx < bestRarityIdx) {
        bestRarityIdx = currentRarityIdx;
        bestIndex = i;
      }
    }
    return bestIndex;
  }, [cards]);

  const pileOffsets = useMemo(() => {
    return cards.map(() => ({
      x: (Math.random() * 100) - 50,
      y: (Math.random() * 30) - 15,
      rot: (Math.random() * 16) - 8
    }));
  }, [cards]);

  useEffect(() => {
    if (isOpen) {
      setFlippedCount(0);
      setFlippedStates({});
      setIsAutoRunning(false);
      setBlockManualClicks(false);
      setShowSummary(false);
    }
  }, [isOpen, cards]);

  const flipAndMove = async (idx: number, fromAuto = false) => {
    if (!fromAuto && blockManualClicks) return;
    if (flippedStates[idx] && flippedStates[idx] !== 'idle') return;
    if (idx === chaseIndex && flippedCount < cards.length - 1) return;

    audioService.play('card_reveal');
    
    setFlippedStates(prev => ({ ...prev, [idx]: 'revealing' }));
    setFlippedCount(prev => prev + 1);

    const isChase = idx === chaseIndex;
    const displayDuration = isAutoRunning ? 200 : 600;

    setTimeout(() => {
      if (isChase) {
        setFlippedStates(prev => ({ ...prev, [idx]: 'chase' }));
        audioService.play('divine_reveal');
        setTimeout(() => setShowSummary(true), 1000);
      } else {
        setFlippedStates(prev => ({ ...prev, [idx]: 'collected' }));
      }
    }, displayDuration);

    // If all but chase are flipped, unlock chase
    if (flippedCount === cards.length - 1 && !isChase) {
      setBlockManualClicks(false);
    }
  };

  const autoFlipAll = async () => {
    if (isAutoRunning) return;
    setIsAutoRunning(true);
    setBlockManualClicks(true);

    const stack = [];
    for (let i = 0; i < cards.length; i++) {
      if (!flippedStates[i] && i !== chaseIndex) {
        stack.push(i);
      }
    }

    // Sort sequentially (left to right) for the crescendo effect
    stack.sort((a, b) => a - b);

    for (let i = 0; i < stack.length; i++) {
      flipAndMove(stack[i], true);
      // Crescendo effect: shorter delay at start, longer towards the end
      // Start at 80ms, end at 300ms
      const progress = i / stack.length;
      const delay = 80 + (progress * 220);
      await new Promise(r => setTimeout(r, delay));
    }
    
    setIsAutoRunning(false);
  };

  if (!isOpen) return null;

  const arc = 120;
  const count = cards.length;
  const step = count > 1 ? arc / (count - 1) : 0;
  const startAngle = (arc / 2) * -1;

  const isGodPack = cards.length > 0 && cards[0]?.is_god_pack;

  useEffect(() => {
    if (isOpen && isGodPack) {
      audioService.play('god_pack');
    }
  }, [isOpen, isGodPack]);

  return (
    <div 
      onClick={() => {
        if (!showSummary && !isAutoRunning) {
          autoFlipAll();
        }
      }}
      className={cn(
        "fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-end transition-opacity duration-500 cursor-pointer",
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* God Pack Flash */}
      {isGodPack && isOpen && flippedCount === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, times: [0, 0.2, 1] }}
          className="absolute inset-0 bg-yellow-400 z-[110] pointer-events-none"
        />
      )}
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#fc3f46 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      {cards.length > 0 && cards[0]?.is_god_pack && (
        <div className="absolute top-0 inset-x-0 z-50 text-center py-3 bg-yellow-400 border-b-4 border-[var(--border)] font-black text-2xl uppercase tracking-widest animate-pulse">
          ⚡ GOD PACK ⚡
        </div>
      )}

      {/* Header */}
      <div className="absolute top-12 left-0 right-0 text-center z-10 px-4">
        <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
          Pack Unboxing
        </h2>
        <p className="text-white/60 font-bold mt-2 uppercase tracking-widest text-sm">
          {flippedCount} / {cards.length} Cards Revealed
        </p>
      </div>

      {/* Close Button */}
      {showSummary && (
        <button 
          onClick={onClose}
          className="absolute top-10 right-10 bg-white text-black px-8 py-3 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xl hover:bg-gray-100 transition-all z-[110] active:translate-y-1 active:shadow-none"
        >
          Finish
        </button>
      )}

      {/* Auto Reveal Button */}
      {!showSummary && flippedCount < cards.length - 1 && (
        <div className="fixed bottom-8 right-8 z-[110]">
          <button 
            onClick={autoFlipAll}
            disabled={isAutoRunning}
            className="bg-[#ffdf6c] text-black px-8 py-4 rounded-full border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-lg hover:bg-yellow-300 transition-all flex items-center gap-2 active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <Sparkles className="w-6 h-6" />
            Auto-Reveal
          </button>
        </div>
      )}

      {/* Fan Stage */}
      <div className="relative w-full h-[60vh] flex justify-center items-end pb-[10vh]">
        {cards.map((card, i) => {
          const state = flippedStates[i] || 'idle';
          const angle = startAngle + (i * step);
          const xOffset = (i - (count - 1) / 2) * (count > 15 ? 25 : 38);
          const isChase = i === chaseIndex;
          const isLocked = isChase && flippedCount < count - 1;
          const isRevealing = state === 'revealing';
          const isCollected = state === 'collected';
          const isChaseRevealed = state === 'chase';
          
          let transform = `translateX(${xOffset}px) rotate(${angle}deg)`;
          let zIndex = i;

          if (isRevealing) {
            transform = `translateX(${xOffset}px) translateY(-100px) rotate(0deg) scale(1.5)`;
            zIndex = 2000 + i;
          } else if (isCollected) {
            const pile = pileOffsets[i];
            transform = `translateY(calc(-55vh + ${pile.y}px)) translateX(${pile.x}px) rotate(${pile.rot}deg) scale(0.6)`;
            zIndex = 500 + i;
          } else if (isChaseRevealed) {
            transform = `translateY(-35vh) translateX(0) rotate(0deg) scale(2.2)`;
            zIndex = 9999;
          } else if (isChase && !isLocked) {
             // Chase is ready
             transform = `translateX(${xOffset}px) translateY(-30px) rotate(0deg) scale(1.15)`;
             zIndex = 1500;
          }

          return (
            <div
              key={i}
              className={cn(
                "absolute w-[140px] h-[186px] transition-all duration-500 ease-out cursor-pointer preserve-3d",
                isLocked && "grayscale contrast-50 brightness-50 opacity-50 pointer-events-none",
                isCollected && "pointer-events-none opacity-40",
                isChase && !isLocked && !isChaseRevealed && "animate-pulse shadow-[0_0_20px_#ffdf6c]"
              )}
              style={{ transform, zIndex, transformStyle: 'preserve-3d' }}
              onClick={() => flipAndMove(i)}
            >
              <div className={cn(
                "relative w-full h-full transition-transform duration-700 preserve-3d rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                (isRevealing || isCollected || isChaseRevealed) && "rotate-y-180"
              )}>
                {/* Front (Back of card) */}
                <div className="absolute inset-0 backface-hidden bg-[#fe3448] border-2 border-black rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '15px 15px' }} />
                  <span className="text-6xl font-black text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">F</span>
                </div>

                {/* Back (Front of card) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white border-2 border-black rounded-xl overflow-hidden">
                   <CardDisplay card={card} showQuantity={false} showNewBadge={card.is_new} />
                   
                   {/* Slot Type Label */}
                   {state === 'chase' && (
                     <div className="absolute top-2 right-2 z-20">
                        {card.slot_type === 'variance' && card.rarity !== 'Common' && (
                          <div className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-black uppercase animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                             🎲 Variance Hit!
                          </div>
                        )}
                        {card.slot_type === 'foil_chase_sr_plus' && (
                          <div className="bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                             ✨ Chase Slot
                          </div>
                        )}
                        {card.is_god_pack && (
                          <div className="bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded border border-black uppercase animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                             ⚡ God Pack
                          </div>
                        )}
                     </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Overlay */}
      <AnimatePresence>
        {showSummary && summary && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center px-4 z-[120]"
          >
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex gap-8 items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">XP Gained</p>
                  <p className="text-xl font-black text-blue-600">+{summary.xp_gained}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center border-2 border-yellow-200">
                  <Sparkles className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">New Cards</p>
                  <p className="text-xl font-black text-yellow-600">{summary.new_card_count}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}
