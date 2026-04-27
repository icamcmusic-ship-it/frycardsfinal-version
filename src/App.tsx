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
import { ErrorBoundary } from './components/ErrorBoundary';
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
import { Quests } from './pages/Quests';
import { Achievements } from './pages/Achievements';
import { Changelog } from './pages/Changelog';
import { HowToPlay } from './pages/HowToPlay';
import { RarePulls } from './pages/RarePulls';
import { Loader2 } from 'lucide-react';

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
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        useProfileStore.getState().fetchProfile();
      }
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
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: 'brut-border text-sm font-black uppercase',
          style: {
            borderRadius: '1rem',
            background: '#fff',
            color: '#111',
            border: '4px solid #111',
            boxShadow: '4px 4px 0px 0px #111',
          },
        }}
      />
      <ErrorBoundary>
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
              <Route path="/quests" element={<Quests />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/season-pass" element={<SeasonPass />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/rare-pulls" element={<RarePulls />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/how-to-play" element={<HowToPlay />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
