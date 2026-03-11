import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'neon' | 'ocean' | 'sunset' | 'forest' | 'monochrome' | 'candy';
type GameStyle = 'retro' | 'neon' | 'minimal' | 'fantasy' | 'dark';

interface ThemeStore { 
  theme: Theme; 
  gameStyle: GameStyle;
  setTheme: (t: Theme) => void; 
  setGameStyle: (style: GameStyle) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      gameStyle: 'retro',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      setGameStyle: (gameStyle) => {
        set({ gameStyle });
        document.documentElement.setAttribute('data-style', gameStyle);
      },
    }),
    { name: 'theme-storage' }
  )
);
