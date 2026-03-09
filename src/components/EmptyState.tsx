import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaText: string;
  ctaPath?: string;
  ctaAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaText, ctaPath, ctaAction }: EmptyStateProps) {
  const CTA = ctaAction ? (
    <button 
      onClick={ctaAction}
      className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
      {ctaText}
    </button>
  ) : (
    <Link 
      to={ctaPath || '#'}
      className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
      {ctaText}
    </Link>
  );

  return (
    <div className="text-center py-20 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-black">
        <Icon className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-2xl font-black text-black mb-2 uppercase">{title}</h3>
      <p className="text-slate-600 font-bold mb-6">{description}</p>
      {CTA}
    </div>
  );
}
