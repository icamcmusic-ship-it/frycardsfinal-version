import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRarityStyles(rarity: string, isFoil: boolean) {
  if (isFoil) return "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-[foilShimmer_2s_linear_infinite] text-white";
  switch (rarity) {
    case 'Common': return "bg-white text-black border-black";
    case 'Uncommon': return "bg-green-500 text-white border-black";
    case 'Rare': return "bg-blue-500 text-white border-black";
    case 'Super-Rare': return "bg-purple-500 text-white border-black";
    case 'Mythic': return "bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 animate-[foilShimmer_2s_linear_infinite] text-black border-black";
    case 'Divine': return "bg-gradient-to-r from-red-600 via-red-400 to-red-600 animate-[foilShimmer_2s_linear_infinite] text-white border-black";
    default: return "bg-slate-400 text-white border-black";
  }
}
