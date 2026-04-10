import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutGrid, ShoppingBag, Plus, Coins, Trophy, Star } from 'lucide-react';
import { cn, getCardBackUrl, getRarityStyles } from '../lib/utils';

import { CardDisplay } from './CardDisplay';

interface Card3DModalProps {
  card: any;
  cardBackUrl: string | null;
  onClose: () => void;
  onSell?: (card: any) => void;
  onList?: (card: any) => void;
  onAddToDeck?: (card: any) => void;
  onToggleWishlist?: (cardId: string) => void;
  isWishlisted?: boolean;
}

export function Card3DModal({ card, cardBackUrl, onClose, onSell, onList, onAddToDeck, onToggleWishlist, isWishlisted }: Card3DModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [localWishlisted, setLocalWishlisted] = useState(isWishlisted);

  const handleToggleWishlist = async () => {
    if (!onToggleWishlist) return;
    setLocalWishlisted(!localWishlisted);
    onToggleWishlist(card.id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateY(((x - centerX) / centerX) * 12);
    setRotateX(((centerY - y) / centerY) * 12);
  };

  const handleMouseLeave = () => { setRotateX(0); setRotateY(0); };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-60 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col lg:flex-row items-center gap-10 max-w-4xl w-full" onClick={e => e.stopPropagation()}>

          {/* 3D Card */}
          <div
            ref={cardRef}
            className="shrink-0 cursor-pointer"
            style={{ perspective: '1000px', width: 280 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setIsFlipped(f => !f)}
          >
            <motion.div
              style={{ transformStyle: 'preserve-3d', width: 280, height: 373 }}
              animate={{
                rotateX: isFlipped ? 0 : rotateX,
                rotateY: isFlipped ? 180 : rotateY,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <CardDisplay 
                  card={card} 
                  showQuantity={false} 
                  showNewBadge={false}
                  className="w-full h-full border-0" // Remove border as CardDisplay has its own
                />
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <img
                  src={getCardBackUrl(cardBackUrl)}
                  alt="Card Back"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
            <p className="text-center text-white/50 text-xs mt-3 font-bold">
              {isFlipped ? 'Click to flip back' : 'Click to flip • Hover to tilt'}
            </p>
          </div>

          {/* Card Info Panel */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-1 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] min-w-0"
          >
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-3xl font-black uppercase text-[var(--text)]">{card.name}</h2>
              {onToggleWishlist && (
                <button 
                  onClick={handleToggleWishlist}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors border-2 border-transparent hover:border-[var(--border)]"
                  title={localWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <Star className={cn("w-6 h-6", localWishlisted ? "fill-yellow-400 text-yellow-500" : "text-slate-400")} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={cn("text-xs font-black px-2 py-1 rounded-full border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]",
                getRarityStyles(card.rarity, card.is_foil ?? false))}>
                {card.is_foil ? `✨ Foil ${card.rarity}` : card.rarity}
              </span>
              <span className="text-xs font-bold px-2 py-1 rounded border-2 border-[var(--border)] bg-gray-100 text-black">
                {card.card_type}{card.sub_type ? ` · ${card.sub_type}` : ''}
              </span>
              {card.element && <span className="text-xs font-bold px-2 py-1 rounded border-2 border-blue-300 bg-blue-50 text-blue-700">{card.element}</span>}
            </div>

            {card.keywords && card.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {card.keywords.map((kw: string) => (
                  <span key={kw} className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-800 text-white rounded-full border border-slate-600">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            {!['Location', 'Artifact', 'Event', 'Leader', 'Sacred'].includes(card.card_type || '') && (card.hp != null || card.attack != null || card.defense != null) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {card.hp != null && <div className="text-center bg-red-50 border-2 border-red-200 rounded-xl p-2"><p className="text-xs text-red-400 font-bold">HP</p><p className="text-xl font-black text-red-600">{card.hp}</p></div>}
                {card.attack != null && <div className="text-center bg-orange-50 border-2 border-orange-200 rounded-xl p-2"><p className="text-xs text-orange-400 font-bold">ATK</p><p className="text-xl font-black text-orange-600">{card.attack}</p></div>}
                {card.defense != null && <div className="text-center bg-blue-50 border-2 border-blue-200 rounded-xl p-2"><p className="text-xs text-blue-400 font-bold">DEF</p><p className="text-xl font-black text-blue-600">{card.defense}</p></div>}
              </div>
            )}

            {(card.dice_cost != null || card.bounty != null) && (
              <div className="flex gap-3 mb-4">
                {card.dice_cost != null && (
                  <div className="text-center bg-purple-50 border-2 border-purple-200 rounded-xl p-2 flex-1">
                    <p className="text-xs text-purple-400 font-bold">DICE COST</p>
                    <p className="text-xl font-black text-purple-600">{card.dice_cost}</p>
                  </div>
                )}
                {(card.bounty ?? 0) > 0 && (
                  <div className="text-center bg-yellow-50 border-2 border-yellow-200 rounded-xl p-2 flex-1">
                    <p className="text-xs text-yellow-500 font-bold">BOUNTY</p>
                    <p className="text-xl font-black text-yellow-600">{card.bounty}</p>
                  </div>
                )}
              </div>
            )}

            {card.ability_text && (
              <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 mb-4">
                <p className="text-xs font-black uppercase text-slate-400 mb-1">Ability</p>
                <p className="text-sm font-bold text-[var(--text)]">{card.ability_text}</p>
              </div>
            )}

            {card.secondary_ability_text && (
              <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 mb-4">
                <p className="text-xs font-black uppercase text-slate-400 mb-1">Secondary Ability</p>
                <p className="text-sm font-bold text-[var(--text)]">{card.secondary_ability_text}</p>
              </div>
            )}

            {(card.flavor_text || (card as any).description) && (
              <p className="text-sm italic text-slate-500 mb-4">"{card.flavor_text || (card as any).description}"</p>
            )}

            <div className="text-xs text-slate-400 font-bold flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <span>Copies owned: {card.is_foil ? (card.foil_quantity ?? card.quantity) : card.quantity}</span>
                {card.author && <span>Art by {card.author}</span>}
              </div>
              {!card.is_foil && (card.foil_quantity ?? 0) > 0 && (
                <span className="text-yellow-600">✨ You also own {card.foil_quantity} foil {(card.foil_quantity ?? 0) === 1 ? 'copy' : 'copies'}</span>
              )}
              {card.is_foil && (card.quantity ?? 0) > 0 && (
                <span className="text-slate-500">You also own {card.quantity} normal {(card.quantity ?? 0) === 1 ? 'copy' : 'copies'}</span>
              )}
            </div>

            {/* Actions */}
            {(onSell || onList || onAddToDeck) && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                {onAddToDeck && (
                  <button 
                    onClick={() => onAddToDeck(card)}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    <LayoutGrid className="w-5 h-5" />
                    Add to Deck
                  </button>
                )}
                {onList && (
                  <button 
                    onClick={() => onList(card)}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    <Trophy className="w-5 h-5" />
                    List on Market
                  </button>
                )}
                {onSell && (
                  <button 
                    onClick={() => onSell(card)}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    <Coins className="w-5 h-5" />
                    Quick Sell
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
