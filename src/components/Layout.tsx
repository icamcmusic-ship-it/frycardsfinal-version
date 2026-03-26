import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { supabase } from '../lib/supabase';
import { Coins, Gem, Home, PackageOpen, LayoutGrid, Store, ShoppingBag, Users, ArrowRightLeft, Trophy, Gift, User as UserIcon, LogOut, Bell, Settings as SettingsIcon, Zap, Menu, X, Layers, Target, MessageSquare, Sword, Award, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatSidebar } from './ChatSidebar';

export function Layout() {
  const { user, setSession, setUser } = useAuthStore();
  const { profile, fetchProfile, setProfile } = useProfileStore();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count');
      if (!error && data !== null) {
        setUnreadCount(data);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
      fetchUnreadCount();

      const profileChannel = supabase
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

      const notifChannel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      return () => {
        profileChannel.unsubscribe();
        notifChannel.unsubscribe();
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
    { name: 'Home', path: '/', icon: Home, category: 'Main' },
    { name: 'Collection', path: '/collection', icon: LayoutGrid, category: 'Main' },
    { name: 'Store', path: '/store', icon: Store, category: 'Main' },
    { name: 'Market', path: '/marketplace', icon: ShoppingBag, category: 'Main' },
    { name: 'Profile', path: '/profile', icon: UserIcon, category: 'Main' },
    
    { name: 'Battle', path: '/battle', icon: Sword, category: 'Gameplay' },
    { name: 'Decks', path: '/decks', icon: Layers, category: 'Gameplay' },
    
    { name: 'Social', path: '/social', icon: Users, category: 'Social' },
    { name: 'Trades', path: '/trades', icon: ArrowRightLeft, category: 'Social' },
    
    { name: 'Quests', path: '/quests', icon: Target, category: 'Progression' },
    { name: 'Achievements', path: '/achievements', icon: Award, category: 'Progression' },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy, category: 'Progression' },
    { name: 'Season Pass', path: '/season-pass', icon: Gift, category: 'Progression' },
    
    { name: 'Settings', path: '/settings', icon: SettingsIcon, category: 'System' },
  ];

  if (profile?.is_admin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldAlert, category: 'System' });
  }

  const primaryNav = navItems.slice(0, 5);
  const secondaryNav = navItems.slice(5);

  const groupedSecondaryNav = secondaryNav.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  const [nextRegen, setNextRegen] = useState<number | null>(null);

  useEffect(() => {
    if (profile && profile.energy < profile.max_energy && profile.energy_last_regen) {
      const regenTime = new Date(profile.energy_last_regen).getTime() + 15 * 60 * 1000;
      setNextRegen(regenTime);
      
      const timer = setInterval(() => {
        if (Date.now() >= regenTime) {
          if (profile) {
            setProfile({ ...profile, energy: Math.min(profile.energy + 1, profile.max_energy) });
          }
          fetchProfile(profile.id);
        } else {
          setNextRegen(regenTime); // Force re-render for countdown
        }
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setNextRegen(null);
    }
  }, [profile?.energy, profile?.energy_last_regen, profile?.max_energy, fetchProfile, profile?.id]);

  const formatRegenTime = () => {
    if (!nextRegen) return null;
    const diff = Math.max(0, nextRegen - Date.now());
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-red-400/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b-4 border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-500 border-2 border-[var(--border)] flex items-center justify-center font-black text-white shadow-[2px_2px_0px_0px_var(--border)]">
              F
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block uppercase">Frycards</span>
          </div>

          {profile && (
            <div className="flex items-center gap-4">
              <div 
                className="group relative flex items-center gap-1.5 bg-blue-100 px-3 py-1.5 rounded-full border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)] cursor-help"
                title={nextRegen ? `Next energy in ${formatRegenTime()}` : "Energy full"}
              >
                <Zap className="w-4 h-4 text-blue-600" />
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold font-mono text-black">
                    {profile.energy}/{profile.max_energy}
                  </span>
                  {nextRegen && (
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">
                      {formatRegenTime()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-100 px-3 py-1.5 rounded-full border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-bold font-mono text-black">{profile.gold_balance?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-full border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]">
                <Gem className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold font-mono text-black">{profile.gem_balance?.toLocaleString() || 0}</span>
              </div>
              <Link 
                to="/notifications"
                className="relative p-2 hover:bg-blue-100 rounded-full transition-colors text-[var(--text)] border-2 border-transparent hover:border-[var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)]"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[var(--border)]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={cn(
                  "p-2 rounded-full transition-all border-2",
                  isChatOpen 
                    ? "bg-blue-400 text-black border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]" 
                    : "hover:bg-blue-100 text-[var(--text)] border-transparent hover:border-[var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)]"
                )}
                title="Global Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-red-100 rounded-full transition-colors text-[var(--text)] border-2 border-transparent hover:border-[var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)]"
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
        <aside className="hidden md:flex flex-col w-64 border-r-4 border-[var(--border)] p-4 gap-2 bg-[var(--surface)] overflow-y-auto">
          {Object.entries(
            navItems.reduce((acc, item) => {
              if (!acc[item.category]) acc[item.category] = [];
              acc[item.category].push(item);
              return acc;
            }, {} as Record<string, typeof navItems>)
          ).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h3 className="px-4 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{category}</h3>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2",
                        isActive 
                          ? "bg-blue-400 text-black border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] font-bold" 
                          : "text-[var(--text)] hover:text-black hover:bg-blue-50 border-transparent hover:border-[var(--border)] hover:shadow-[4px_4px_0px_0px_var(--border)] font-medium opacity-80 hover:opacity-100"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive && "text-black")} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-4 border-[var(--border)] bg-[var(--surface)] pb-safe z-50">
          <div className="flex justify-around items-center h-16 px-2">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive ? "text-blue-600 font-bold" : "text-[var(--text)] opacity-70 hover:opacity-100"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-blue-600")} />
                  <span className="text-[10px]">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isMobileMenuOpen ? "text-blue-600 font-bold" : "text-[var(--text)] opacity-70 hover:opacity-100"
              )}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-blue-600" /> : <Menu className="w-5 h-5" />}
              <span className="text-[10px]">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile Secondary Nav Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
            <div 
              className="absolute bottom-16 left-0 right-0 bg-[var(--surface)] border-t-4 border-[var(--border)] rounded-t-2xl p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {Object.entries(groupedSecondaryNav).map(([category, items]) => (
                <div key={category}>
                  <h3 className="px-4 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{category}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2",
                            isActive 
                              ? "bg-blue-400 text-black border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] font-bold" 
                              : "text-[var(--text)] hover:text-black hover:bg-blue-50 border-transparent hover:border-[var(--border)] font-medium"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", isActive && "text-black")} />
                          <span className="text-sm">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    </div>
  );
}
