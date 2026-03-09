import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark' | 'neon';
  setTheme: (theme: 'light' | 'dark' | 'neon') => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = (localStorage.getItem('frycards_theme') as ThemeState['theme']) || 'light';
  document.documentElement.classList.add(`theme-${saved}`);
  return {
    theme: saved,
    setTheme: (theme) => {
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-neon');
      document.documentElement.classList.add(`theme-${theme}`);
      localStorage.setItem('frycards_theme', theme);
      set({ theme });
    },
  };
});
