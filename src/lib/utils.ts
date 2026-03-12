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
  if (isFoil) return "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-[foilShimmer_2s_linear_infinite] text-white";
  switch (rarity) {
    case 'Common': return "bg-white text-black border-black";
    case 'Uncommon': return "bg-green-500 text-white border-black";
    case 'Rare': return "bg-blue-500 text-white border-black";
    case 'Super-Rare': return "bg-purple-500 text-white border-black";
    case 'Mythic': return "bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 animate-[foilShimmer_2s_linear_infinite] text-black border-black";
    case 'Divine': return "bg-gradient-to-r from-red-700 via-orange-500 to-red-700 animate-[foilShimmer_1.5s_linear_infinite] text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]";
    default: return "bg-slate-400 text-white border-black";
  }
}
