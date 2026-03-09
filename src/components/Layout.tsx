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
    <div className="min-h-screen bg-yellow-50 text-slate-900 font-sans selection:bg-red-400/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-500 border-2 border-black flex items-center justify-center font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              F
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block uppercase">Frycards</span>
          </div>

          {profile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-yellow-100 px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-bold font-mono">{profile.gold_balance?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Gem className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold font-mono">{profile.gem_balance?.toLocaleString() || 0}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-red-100 rounded-full transition-colors text-slate-700 border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
        <aside className="hidden md:flex flex-col w-64 border-r-4 border-black p-4 gap-2 bg-white">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2",
                  isActive 
                    ? "bg-blue-400 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold" 
                    : "text-slate-600 hover:text-black hover:bg-blue-50 border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-medium"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-black")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white pb-safe z-50">
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
                    isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-blue-600")} />
                  <span className="text-[10px]">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
