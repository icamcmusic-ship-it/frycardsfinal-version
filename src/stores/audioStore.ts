import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  audioEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setAudioEnabled: (v: boolean) => void;
  setMusicEnabled: (v: boolean) => void;
  setSfxEnabled: (v: boolean) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      masterVolume: 80,
      musicVolume: 60,
      sfxVolume: 70,
      audioEnabled: true,
      musicEnabled: true,
      sfxEnabled: true,
      setMasterVolume: (v) => set({ masterVolume: v }),
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setAudioEnabled: (v) => set({ audioEnabled: v }),
      setMusicEnabled: (v) => set({ musicEnabled: v }),
      setSfxEnabled: (v) => set({ sfxEnabled: v }),
    }),
    {
      name: 'frycards-audio-settings',
    }
  )
);
