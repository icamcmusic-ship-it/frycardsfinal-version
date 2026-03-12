import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn, getCardBackUrl } from '../lib/utils';

interface Card3DModalProps {
  card: any;
  cardBackUrl: string | null;
  onClose: () => void;
}

export function Card3DModal({ card, cardBackUrl, onClose }: Card3DModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

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
            style={{ perspective: '1000px', width: 240 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setIsFlipped(f => !f)}
          >
            <motion.div
              style={{ transformStyle: 'preserve-3d', width: 240, height: 320 }}
              animate={{
                rotateX: isFlipped ? 0 : rotateX,
                rotateY: isFlipped ? 180 : rotateY,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {card.is_video
                  ? <video src={card.image_url} autoPlay muted loop className="w-full h-full object-cover bg-black" />
                  : <img src={card.image_url} alt={card.name} className="w-full h-full object-cover bg-black" />}
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
            <p className="text-center text-white/50 text-xs mt-3 font-bold">Click to flip • Hover to tilt</p>
          </div>

          {/* Card Info Panel */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-1 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] min-w-0"
          >
            <h2 className="text-3xl font-black uppercase text-[var(--text)] mb-1">{card.name}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs font-black px-2 py-1 rounded border-2 border-[var(--border)] bg-gray-100 text-black">{card.rarity}</span>
              <span className="text-xs font-bold px-2 py-1 rounded border-2 border-[var(--border)] bg-gray-100 text-black">{card.card_type}</span>
              {card.element && <span className="text-xs font-bold px-2 py-1 rounded border-2 border-blue-300 bg-blue-50 text-blue-700">{card.element}</span>}
              {card.is_foil && <span className="text-xs font-black px-2 py-1 rounded border-2 border-yellow-400 bg-yellow-50 text-yellow-700">✨ FOIL</span>}
            </div>

            {/* Stats */}
            {(card.hp || card.attack || card.defense) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {card.hp && <div className="text-center bg-red-50 border-2 border-red-200 rounded-xl p-2"><p className="text-xs text-red-400 font-bold">HP</p><p className="text-xl font-black text-red-600">{card.hp}</p></div>}
                {card.attack && <div className="text-center bg-orange-50 border-2 border-orange-200 rounded-xl p-2"><p className="text-xs text-orange-400 font-bold">ATK</p><p className="text-xl font-black text-orange-600">{card.attack}</p></div>}
                {card.defense && <div className="text-center bg-blue-50 border-2 border-blue-200 rounded-xl p-2"><p className="text-xs text-blue-400 font-bold">DEF</p><p className="text-xl font-black text-blue-600">{card.defense}</p></div>}
              </div>
            )}

            {card.ability_text && (
              <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 mb-4">
                <p className="text-xs font-black uppercase text-slate-400 mb-1">Ability</p>
                <p className="text-sm font-bold text-[var(--text)]">{card.ability_text}</p>
              </div>
            )}

            {card.flavor_text && (
              <p className="text-sm italic text-slate-500 mb-4">"{card.flavor_text}"</p>
            )}

            <div className="text-xs text-slate-400 font-bold">
              <span>Copies owned: {card.quantity}</span>
              {card.author && <span className="ml-4">Art by {card.author}</span>}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
