import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './stores/authStore';
import { useProfileStore } from './stores/profileStore';
import { useThemeStore } from './stores/themeStore';
import { useAudioStore } from './stores/audioStore';
import { Toaster } from 'react-hot-toast';
import { audioService } from './services/AudioService';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import { Store } from './pages/Store';
import { Collection } from './pages/Collection';
import { Marketplace } from './pages/Marketplace';
import { Social } from './pages/Social';
import { Trades } from './pages/Trades';
import { Leaderboard } from './pages/Leaderboard';
import { SeasonPass } from './pages/SeasonPass';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { Notifications } from './pages/Notifications';
import { Decks } from './pages/Decks';
import { Quests } from './pages/Quests';
import { Battle } from './pages/Battle';
import { Achievements } from './pages/Achievements';
import { Admin } from './pages/Admin';
import { Loader2 } from 'lucide-react';
import { FloatingChat } from './components/FloatingChat';

export default function App() {
  const { user, initialized, setUser, setSession, setInitialized } = useAuthStore();
  const { profile } = useProfileStore();
  const { theme, gameStyle, setGameStyle } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-style', gameStyle);
  }, [theme, gameStyle]);

  useEffect(() => {
    audioService.preload().catch(console.error);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitialized(true);

      if (session) {
        const saved = localStorage.getItem('frycards_settings');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            if (data.game_style) setGameStyle(data.game_style);
            const audioStore = useAudioStore.getState();
            if (data.master_volume !== undefined) audioStore.setMasterVolume(data.master_volume);
            if (data.music_volume !== undefined) audioStore.setMusicVolume(data.music_volume);
            if (data.sfx_volume !== undefined) audioStore.setSfxVolume(data.sfx_volume);
            if (data.audio_enabled !== undefined) audioStore.setAudioEnabled(data.audio_enabled);
          } catch (e) {
            console.error('Error parsing saved settings:', e);
          }
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setInitialized, setGameStyle]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" />
      <Routes>
        {!user ? (
          <>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/inventory" element={<Navigate to="/store?tab=inventory" replace />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/social" element={<Social />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/battle" element={<Battle />} />
            <Route 
              path="/admin" 
              element={
                profile?.is_admin ? (
                  <Admin />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/season-pass" element={<SeasonPass />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
      <FloatingChat />
    </BrowserRouter>
  );
}
