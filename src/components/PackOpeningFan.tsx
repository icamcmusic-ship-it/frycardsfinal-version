import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, Zap, SkipForward, ArrowRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import { audioService } from '../services/AudioService';

interface PackOpeningFanProps {
  isOpen: boolean;
  onClose: () => void;
  cards: any[];
  summary: { 
    xp_gained: number, 
    new_card_count: number,
    pack_points_earned?: number
  } | null;
}

const RARITY_ORDER = ['Divine', 'Mythic', 'Super-Rare', 'Rare', 'Uncommon', 'Common'];

export function PackOpeningFan({ isOpen, onClose, cards, summary }: PackOpeningFanProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isAutoOpening, setIsAutoOpening] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  
  const isAutoOpeningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const chaseIndex = useMemo(() => {
    if (!cards.length) return -1;
    let bestIdx = -1;
    let bestRank = Infinity;

    cards.forEach((card, i) => {
      const rank = RARITY_ORDER.indexOf(card.rarity);
      if (rank < bestRank) {
        bestRank = rank;
        bestIdx = i;
      }
    });

    // Only "Chase" if it's Rare or better
    return bestRank <= RARITY_ORDER.indexOf('Rare') ? bestIdx : -1;
  }, [cards]);

  const revealCard = useCallback((index: number) => {
    if (revealed.has(index)) return;
    
    // Chase card locking logic: can't reveal chase until others are done
    if (index === chaseIndex && revealed.size < cards.length - 1) {
      return;
    }

    const card = cards[index];
    
    // Play sound based on rarity
    if (card.rarity === 'Divine') {
      audioService.play('divine_reveal');
      if ('vibrate' in navigator) navigator.vibrate([15, 40, 15]);
    } else if (card.rarity === 'Mythic') {
      audioService.play('mythic_reveal');
      if ('vibrate' in navigator) navigator.vibrate([15, 40, 15]);
    } else if (['Super-Rare', 'Rare'].includes(card.rarity)) {
      audioService.play('rare_reveal');
    } else {
      audioService.play('card_reveal');
    }

    setRevealed(prev => {
      const next = new Set(prev);
      next.add(index);
      if (next.size === cards.length) {
        setTimeout(() => setShowSummary(true), 1200);
      }
      return next;
    });
    setCurrentIndex(index);
  }, [cards, chaseIndex, revealed.size]);

  useEffect(() => {
    if (!isOpen || showSummary) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(cards.length - 1, prev === -1 ? 0 : prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(0, prev === -1 ? 0 : prev - 1));
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= 0 && currentIndex < cards.length) {
          revealCard(currentIndex);
        } else if (currentIndex === -1) {
          setCurrentIndex(0);
          revealCard(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSummary, cards.length, currentIndex, revealCard]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setRevealed(new Set());
      setCurrentIndex(-1);
      setIsAutoOpening(false);
      isAutoOpeningRef.current = false;
      setShowSummary(false);
      
      const isGodPack = cards.some(c => c.is_god_pack);
      if (isGodPack) audioService.play('god_pack');
    }
  }, [isOpen, cards]);

  const autoRevealAll = async () => {
    if (isAutoOpening) {
      // Cancel opening if already in progress
      setIsAutoOpening(false);
      isAutoOpeningRef.current = false;
      return;
    }
    setIsAutoOpening(true);
    isAutoOpeningRef.current = true;

    // Flip all normal cards first
    for (let i = 0; i < cards.length; i++) {
      if (!isAutoOpeningRef.current) return;
      if (i === chaseIndex) continue;
      if (revealed.has(i)) return; // Should check from state, but let's assume it's safe

      revealCard(i);
      await new Promise(r => setTimeout(r, 150));
    }

    // Finally flip chase card
    if (isAutoOpeningRef.current && chaseIndex !== -1) {
      await new Promise(r => setTimeout(r, 400));
      if (!isAutoOpeningRef.current) return;
      revealCard(chaseIndex);
    }

    setIsAutoOpening(false);
    isAutoOpeningRef.current = false;
  };

  const sortedSummaryCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const rankA = RARITY_ORDER.indexOf(a.rarity);
      const rankB = RARITY_ORDER.indexOf(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });
  }, [cards]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#fc3f46 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      <AnimatePresence mode="wait">
        {!showSummary ? (
          <motion.div 
            key="reveal-stage"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center"
          >
            {/* Header */}
            <div className="absolute top-8 text-center">
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-2">
                Revealing Pack
              </h2>
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-48 bg-white/10 rounded-full overflow-hidden border border-white/20">
                  <motion.div 
                    className="h-full bg-yellow-400"
                    animate={{ width: `${(revealed.size / cards.length) * 100}%` }}
                  />
                </div>
                <span className="text-white/60 font-black text-xs uppercase tracking-widest">
                  {revealed.size} / {cards.length}
                </span>
              </div>
            </div>

            {/* Skip All */}
            {revealed.size < cards.length && (
              <button 
                onClick={autoRevealAll}
                className="absolute top-12 right-0 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full border border-white/20 font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all"
              >
                {isAutoOpening ? <X className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                {isAutoOpening ? 'Stop' : 'Skip All'}
              </button>
            )}

            {/* Fan Stage */}
            <div ref={containerRef} className="relative w-full h-[50vh] flex justify-center items-center">
              {cards.map((card, i) => {
                const isRevealed = revealed.has(i);
                const isCurrent = currentIndex === i;
                const isChase = i === chaseIndex;
                const isLocked = isChase && revealed.size < cards.length - 1;
                
                const arc = 120;
                const step = cards.length > 1 ? arc / (cards.length - 1) : 0;
                const angle = (step * i) - (arc / 2);
                const xOffset = (i - (cards.length - 1) / 2) * (cards.length > 15 ? 25 : 45);

                return (
                  <motion.div
                    key={i}
                    layoutId={`card-${i}`}
                    style={{ 
                      zIndex: isCurrent ? 100 : i,
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                    animate={{
                      x: isCurrent ? 0 : xOffset,
                      y: isCurrent ? -50 : (Math.abs(angle) * 0.8),
                      rotateZ: isCurrent ? 0 : angle,
                      scale: isCurrent ? 1.5 : 1,
                      rotateY: isRevealed ? 180 : 0,
                    }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 100 }}
                    className={cn(
                      "absolute w-[140px] aspect-[3/4] cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500 rounded-xl",
                      isLocked && "opacity-50 grayscale contrast-50 pointer-events-none"
                    )}
                    onClick={() => revealCard(i)}
                    tabIndex={isOpen && !showSummary ? 0 : -1}
                    onMouseEnter={() => !isAutoOpening && setCurrentIndex(i)}
                  >
                    <div className="relative w-full h-full preserve-3d" style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', transformStyle: 'preserve-3d' }}>
                      {/* Card Back */}
                      <div className="absolute inset-0 backface-hidden bg-[#fe3448] border-2 border-black rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '15px 15px' }} />
                        <span className="text-6xl font-black text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">F</span>
                        {isChase && !isRevealed && !isLocked && (
                          <motion.div 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 border-4 border-yellow-400 rounded-xl"
                          />
                        )}
                      </div>

                      {/* Card Front */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white border-2 border-black rounded-xl overflow-hidden shadow-2xl">
                        <CardDisplay card={card} showQuantity={false} />
                        
                        {/* High Rarity Sparkles */}
                        {isRevealed && (card.rarity === 'Divine' || card.rarity === 'Mythic') && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(12)].map((_, j) => (
                              <motion.div
                                key={j}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ 
                                  opacity: [0, 1, 0],
                                  scale: [0, 1.5, 0],
                                  x: (Math.random() - 0.5) * 140,
                                  y: (Math.random() - 0.5) * 186
                                }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: j * 0.1 }}
                                className="absolute w-2 h-2 bg-white rounded-full blur-[1px]"
                                style={{ top: '50%', left: '50%' }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Foil Sweep */}
                        {card.is_foil && (
                          <motion.div 
                            animate={{ x: ['100%', '-100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent skew-x-12 z-10 pointer-events-none"
                          />
                        )}

                        {/* God Pack Border */}
                        {card.is_god_pack && (
                          <div className="absolute inset-0 border-4 border-transparent rounded-xl animate-hue-rotate z-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(white, white), radial-gradient(circle at top left, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)', backgroundOrigin: 'border-box', backgroundClip: 'content-box, border-box' }} />
                        )}

                        {/* Effect Tooltip on Hover */}
                        {isCurrent && isRevealed && card.effect_text && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute inset-x-0 bottom-0 z-50 p-2 pointer-events-none"
                          >
                            <div className="bg-black/90 text-white p-2 rounded-lg border-2 border-white/50 text-[8px] font-bold leading-tight shadow-xl">
                              <p className="text-yellow-400 uppercase font-black mb-0.5">{card.keyword || 'Ability'}</p>
                              {card.effect_text}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="summary-stage"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl flex flex-col h-full py-12"
          >
            {/* Summary Header */}
            <div className="flex items-center justify-between mb-8 bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP Gained</span>
                  <span className="text-3xl font-black text-blue-600">+{summary?.xp_gained}</span>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Cards</span>
                  <span className="text-3xl font-black text-yellow-600">{summary?.new_card_count}</span>
                </div>
                {summary?.pack_points_earned && (
                  <>
                    <div className="w-px h-12 bg-slate-100" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pack Points</span>
                      <span className="text-3xl font-black text-indigo-600">+{summary.pack_points_earned}</span>
                    </div>
                  </>
                )}
              </div>
              
              <button 
                onClick={onClose}
                className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all active:translate-y-1"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Summary Grid */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedSummaryCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="aspect-[3/4] relative"
                  style={{ contain: 'layout paint' }}
                >
                  <CardDisplay card={card} showQuantity={false} showNewBadge={card.is_new} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes hue-rotate {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
        .animate-hue-rotate { animation: hue-rotate 3s linear infinite; }
      `}} />
    </motion.div>
  );
}
