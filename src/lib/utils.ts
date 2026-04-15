import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_CARD_BACK = 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=400&q=80';

export function getCardBackUrl(url: string | null | undefined) {
  if (!url || url === 'default') return DEFAULT_CARD_BACK;
  return url;
}

export function getAvatarUrl(url: string | null | undefined, username?: string) {
  if (!url || url === 'default') return null;
  return url;
}

export function getBannerUrl(url: string | null | undefined) {
  if (!url || url === 'default') return null;
  return url;
}

export function getRarityStyles(rarity: string, isFoil: boolean) {
  if (isFoil) return "badge-foil text-black border-black";
  switch (rarity) {
    case 'Common':     return "bg-slate-300 text-slate-800 border-slate-500";
    case 'Uncommon':   return "bg-green-300 text-green-900 border-green-500";
    case 'Rare':       return "bg-blue-300 text-blue-900 border-blue-500";
    case 'Super-Rare': return "bg-purple-300 text-purple-900 border-purple-500";
    case 'Mythic':     return "bg-yellow-300 text-yellow-900 border-yellow-500";
    case 'Divine':     return "bg-red-400 text-red-950 border-red-600";
    default:           return "bg-slate-200 text-slate-700 border-slate-400";
  }
}
