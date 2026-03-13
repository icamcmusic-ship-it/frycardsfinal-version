import React, { useState, useRef } from 'react';
import { cn, getRarityStyles } from '../lib/utils';
import { Sword, Shield, Heart, Sparkles } from 'lucide-react';

interface CardDisplayProps {
  card: {
    name: string;
    rarity: string;
    card_type?: string;
    image_url: string;
    is_video?: boolean;
    is_foil?: boolean;
    quantity?: number;
    foil_quantity?: number;
    is_new?: boolean;
    flavor_text?: string;
    hp?: number;
    attack?: number;
    defense?: number;
    element?: string;
    keywords?: string[];
    ability_text?: string;
    ability_type?: string;
  };
  showQuantity?: boolean;
  showNewBadge?: boolean;
  className?: string;
}

export function CardDisplay({ card, showQuantity = true, showNewBadge = true, className }: CardDisplayProps) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });

    // 3D Tilt for Mythic and Divine
    if (card.rarity === 'Mythic' || card.rarity === 'Divine') {
      const tiltX = (y - 50) / 5; // max 10deg
      const tiltY = (x - 50) / -5; // max 10deg
      setTilt({ x: tiltX, y: tiltY });
    }
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const rarityBorder: Record<string, string> = {
    'Divine':     'border-red-500',
    'Mythic':     'border-yellow-400',
    'Super-Rare': 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.7)]',
    'Rare':       'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    'Uncommon':   'border-green-500',
    'Common':     'border-slate-400',
  };

  const elementGradients: Record<string, string> = {
    'Fire': 'from-red-900/90 via-orange-600/50 to-transparent',
    'Water': 'from-blue-900/90 via-cyan-600/50 to-transparent',
    'Earth': 'from-stone-900/90 via-emerald-900/50 to-transparent',
    'Air': 'from-slate-800/90 via-indigo-400/30 to-transparent',
    'Light': 'from-yellow-600/90 via-amber-200/40 to-transparent',
    'Dark': 'from-purple-950/90 via-slate-900/70 to-transparent',
  };

  const border = rarityBorder[card.rarity] ?? rarityBorder['Common'];
  const elementGradient = elementGradients[card.element || ''] ?? 'from-black/90 via-black/50 to-transparent';

  const isBattle = (card.hp !== undefined || card.attack !== undefined || card.defense !== undefined) && !['Location', 'Artifact', 'Event', 'Leader'].includes(card.card_type || '');
  const isSpell = (card.ability_text || (card.keywords && card.keywords.length > 0)) && !isBattle;
  const isLore = card.flavor_text && !isBattle && !isSpell;

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        perspective: '1000px',
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? 'transform 0.5s ease' : 'none'
      }}
      className={cn(
        'relative w-full aspect-[3/4] rounded-xl border-4 group cursor-pointer transition-all duration-300',
        border,
        className
      )}
    >
      {/* Mythic Particle Effect */}
      {card.rarity === 'Mythic' && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-[particleFloat_2s_infinite]"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }} 
            />
          ))}
        </div>
      )}
      {/* Divine God Rays */}
      {card.rarity === 'Divine' && (
        <div className="absolute -inset-12 -z-10 rounded-full animate-[spin_15s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(239,68,68,0.3)_30deg,transparent_60deg,rgba(239,68,68,0.3)_90deg,transparent_120deg,rgba(239,68,68,0.3)_150deg,transparent_180deg,rgba(239,68,68,0.3)_210deg,transparent_240deg,rgba(239,68,68,0.3)_270deg,transparent_300deg,rgba(239,68,68,0.3)_330deg,transparent_360deg)] opacity-60 blur-xl" />
      )}

      <div className="absolute inset-0 rounded-lg overflow-hidden bg-slate-900">
        {/* Artwork Container */}
        <div className={cn(
          "relative w-full transition-all duration-500",
          isBattle ? "h-[60%]" : "h-full"
        )}>
          {card.is_video ? (
            <video src={card.image_url} autoPlay muted loop playsInline
              className="w-full h-full object-cover" />
          ) : (
            <img src={card.image_url} alt={card.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = '/fallback-card.png'; }} />
          )}

          {/* Divine Frame Break (Top half) */}
          {card.rarity === 'Divine' && (
            <img 
              src={card.image_url} 
              alt="Pop out"
              className="absolute inset-0 w-full h-full object-cover scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-115 transition-all duration-500 z-50 pointer-events-none [clip-path:inset(0_0_30%_0)]" 
            />
          )}

          {/* Spell Overlay */}
          {isSpell && (
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black/40 backdrop-blur-md border-t border-white/20 p-3 flex flex-col gap-2 z-20">
              {card.keywords && card.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.keywords.map(kw => (
                    <span key={kw} className="px-2 py-0.5 bg-white/20 rounded-full text-[8px] font-black uppercase text-white border border-white/30">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-white text-[10px] leading-tight font-medium line-clamp-4">
                {card.ability_text}
              </p>
            </div>
          )}
        </div>

        {/* Battle Stat Block */}
        {isBattle && (
          <div className="h-[40%] bg-slate-950 border-t-4 border-[var(--border)] p-3 flex flex-col justify-between z-20 relative">
            <div className="flex flex-col gap-1">
              <h4 className="text-white font-black text-xs uppercase truncate">{card.name}</h4>
              <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider">{card.card_type} · {card.element}</p>
            </div>
            
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="text-white font-black text-xs">{card.hp}</span>
              </div>
              <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 px-1.5 py-0.5 rounded">
                <Sword className="w-3 h-3 text-orange-500" />
                <span className="text-white font-black text-xs">{card.attack}</span>
              </div>
              <div className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.5 rounded">
                <Shield className="w-3 h-3 text-blue-500" />
                <span className="text-white font-black text-xs">{card.defense}</span>
              </div>
            </div>
          </div>
        )}

        {/* Default / Lore Layout Info */}
        {!isBattle && !isSpell && (
          <div className={cn(
            "absolute bottom-0 inset-x-0 bg-gradient-to-t pt-12 pb-3 px-3 z-20 transition-all duration-300",
            elementGradient
          )}>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-wide truncate leading-tight mb-0.5">{card.name}</p>
              {!['Location', 'Artifact', 'Event', 'Leader'].includes(card.card_type || '') && (
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{card.element || card.card_type}</p>
              )}
              {['Location', 'Artifact', 'Event', 'Leader'].includes(card.card_type || '') && (
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{card.card_type}</p>
              )}
              
              {isLore && (
                <div className="overflow-hidden mt-2">
                  <p className="text-gray-300 text-[10px] italic leading-relaxed line-clamp-2">
                    {card.flavor_text}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Foil / Holographic Effects */}
        {(card.is_foil || (card.foil_quantity ?? 0) > 0) && (
          <div 
            className="absolute inset-0 pointer-events-none z-30 mix-blend-color-dodge opacity-40"
            style={{
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.8) 0%, transparent 50%), 
                           repeating-linear-gradient(${mousePos.x + mousePos.y}deg, 
                             rgba(255,0,0,0.1) 0%, 
                             rgba(255,255,0,0.1) 10%, 
                             rgba(0,255,0,0.1) 20%, 
                             rgba(0,255,255,0.1) 30%, 
                             rgba(0,0,255,0.1) 40%, 
                             rgba(255,0,255,0.1) 50%, 
                             rgba(255,0,0,0.1) 60%)`,
              backgroundSize: '200% 200%',
              backgroundPosition: `${mousePos.x}% ${mousePos.y}%`
            }}
          />
        )}

        {/* Super-Rare Prismatic Sweep */}
        {card.rarity === 'Super-Rare' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-30 mix-blend-overlay">
            <div className="w-[200%] h-[200%] absolute top-0 left-0 bg-gradient-to-r from-transparent via-purple-300/40 to-transparent animate-[sweep_4s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Rarity Badges */}
        <div className={cn(
          "absolute top-2 left-2 z-40 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]",
          getRarityStyles(card.rarity, card.is_foil ?? false)
        )}>
          {card.is_foil ? <span className="flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Foil</span> : card.rarity}
        </div>

        {/* Quantity badge */}
        {showQuantity && card.quantity != null && card.quantity > 1 && (
          <div className="absolute top-2 right-2 z-40 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white/30">
            ×{card.quantity}
          </div>
        )}

        {/* NEW badge */}
        {showNewBadge && card.is_new && (
          <div className="absolute top-8 left-2 z-40 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-black animate-bounce uppercase">
            New!
          </div>
        )}
      </div>
    </div>
  );
}
