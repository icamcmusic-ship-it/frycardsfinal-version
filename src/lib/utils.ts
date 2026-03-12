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
  if (isFoil) return "bg-gradient-to-r from-pink-500 via-yellow-400 via-green-400 via-blue-500 to-purple-500 text-white border-white animate-[foilShimmer_2s_linear_infinite]";
  switch (rarity) {
    case 'Common':     return "bg-slate-600 text-white border-slate-800";
    case 'Uncommon':   return "bg-green-500 text-white border-green-700";
    case 'Rare':       return "bg-blue-500 text-white border-blue-700";
    case 'Super-Rare': return "bg-gradient-to-r from-purple-600 to-violet-500 text-white border-purple-800 shadow-[0_0_8px_rgba(168,85,247,0.6)]";
    case 'Mythic':     return "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black border-yellow-600 shadow-[0_0_12px_rgba(234,179,8,0.8)] animate-[foilShimmer_2s_linear_infinite]";
    case 'Divine':     return "bg-gradient-to-r from-red-600 via-rose-400 to-red-600 text-white border-red-800 shadow-[0_0_16px_rgba(239,68,68,0.9)] animate-[foilShimmer_1.5s_linear_infinite]";
    default:           return "bg-slate-400 text-white border-black";
  }
}
