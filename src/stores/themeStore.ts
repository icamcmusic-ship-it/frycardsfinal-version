import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark' | 'neon';
  setTheme: (theme: 'light' | 'dark' | 'neon') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  setTheme: (theme) => {
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-neon');
    document.documentElement.classList.add(`theme-${theme}`);
    set({ theme });
  },
}));
