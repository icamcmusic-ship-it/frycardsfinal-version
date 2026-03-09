import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Coins, Gem, Home, PackageOpen, LayoutGrid, Store, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const { user, setSession, setUser } = useAuthStore();
  const { profile, fetchProfile, setProfile } = useProfileStore();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);

      const channel = supabase
        .channel('profile-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          setProfile(payload.new as any);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchProfile, setProfile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Packs', path: '/packs', icon: PackageOpen },
    { name: 'Collection', path: '/collection', icon: LayoutGrid },
    { name: 'Market', path: '/marketplace', icon: Store },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              TCG
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">Nexus Cards</span>
          </div>

          {profile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium font-mono">{profile.gold.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
                <Gem className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium font-mono">{profile.gems.toLocaleString()}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content & Sidebar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-white/10 p-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/90 backdrop-blur-lg pb-safe z-50">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]")} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
