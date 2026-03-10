import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'neon';
interface ThemeStore { theme: Theme; setTheme: (t: Theme) => void; }

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    { name: 'frycards-theme' }
  )
);
