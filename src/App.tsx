import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import { Packs } from './pages/Packs';
import { Collection } from './pages/Collection';
import { Marketplace } from './pages/Marketplace';
import { Shop } from './pages/Shop';
import { Social } from './pages/Social';
import { Trades } from './pages/Trades';
import { Leaderboard } from './pages/Leaderboard';
import { SeasonPass } from './pages/SeasonPass';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, initialized, setUser, setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setInitialized]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/packs" element={<Packs />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/social" element={<Social />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/season-pass" element={<SeasonPass />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
