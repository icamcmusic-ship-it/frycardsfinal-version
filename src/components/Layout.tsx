import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { useChatStore } from '../stores/chatStore';
import { supabase } from '../lib/supabase';
import { Coins, Gem, Home, PackageOpen, LayoutGrid, Store, ShoppingBag, Users, ArrowRightLeft, Trophy, Gift, User as UserIcon, LogOut, Bell, Settings as SettingsIcon, Menu, X, Target, MessageSquare, Award, ShieldAlert, Sparkles, BookOpen, History, Sword, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatSidebar } from './ChatSidebar';
import toast from 'react-hot-toast';

export function Layout() {
  const { user, signOut } = useAuthStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { profile, fetchProfile, setProfile, loading: profileLoading } = useProfileStore();
  const { unreadCount: unreadChatCount, setUnreadCount: setUnreadChatCountZustand, addMessage } = useChatStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [newCardCount, setNewCardCount] = useState(0);
  const [pendingTradeCount, setPendingTradeCount] = useState(0);
  const [pendingSocialCount, setPendingSocialCount] = useState(0);
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

  const fetchNewCardCount = async () => {
    if (!user) return;
    try {
      const { data, count, error } = await supabase
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_new', true);
      
      if (!error) {
        setNewCardCount(count ?? 0);
      }
    } catch (err) {
      console.error('Error fetching new card count:', err);
    }
  };

  const fetchPendingCounts = async () => {
    if (!user) return;
    try {
      // Fetch pending trades
      const { count: tradeCount, error: tradeError } = await supabase
        .from('trade_offers')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      
      if (!tradeError) setPendingTradeCount(tradeCount ?? 0);

      // Fetch pending social requests
      const { count: socialCount, error: socialError } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending');
      
      if (!socialError) setPendingSocialCount(socialCount ?? 0);
    } catch (err) {
      console.error('Error fetching pending counts:', err);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUnreadCount();
      fetchNewCardCount();
      fetchPendingCounts();

      const profileChannel = supabase
        .channel('profile-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, () => {
          fetchProfile();
        })
        .subscribe();

      const notifChannel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          fetchUnreadCount();
          const notif = payload.new;
          if (notif.type === 'achievement') {
            toast.success(notif.body || notif.title || 'New Achievement Unlocked!', {
              icon: '🏆',
              duration: 5000,
              position: 'top-center',
              style: {
                border: '4px solid #111',
                padding: '16px',
                color: '#111',
                fontWeight: '900',
                textTransform: 'uppercase',
                borderRadius: '16px',
                boxShadow: '8px 8px 0px 0px #111'
              }
            });
          }
        })
        .subscribe();

      const cardsChannel = supabase
        .channel('user-cards')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_cards',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchNewCardCount();
        })
        .subscribe();

      const tradesChannel = supabase
        .channel('trades-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'trade_offers',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          fetchPendingCounts();
        })
        .subscribe();

      const socialChannel = supabase
        .channel('social-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${user.id}`
        }, () => {
          fetchPendingCounts();
        })
        .subscribe();

      const rarePullChannel = supabase
        .channel('my-rare-pulls')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rare_pull_announcements', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const p = payload.new as any;
            toast.success(`${p.card_rarity} pulled: ${p.card_name}${p.serial_number ? ` #${p.serial_number}/200` : ''}!`,
              { icon: '🌟', duration: 6000 });
          }
        ).subscribe();

      const chatChannel = supabase
        .channel('chat-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages_history',
        }, (payload) => {
          if (payload.new) {
            addMessage(payload.new as any);
            if (payload.new.user_id !== user.id && !isChatOpen) {
              setUnreadChatCountZustand((prev: number) => prev + 1);
            }
          }
        })
        .subscribe();

      return () => {
        profileChannel.unsubscribe();
        notifChannel.unsubscribe();
        cardsChannel.unsubscribe();
        tradesChannel.unsubscribe();
        socialChannel.unsubscribe();
        rarePullChannel.unsubscribe();
        chatChannel.unsubscribe();
      };
    }
  }, [user, fetchProfile, setProfile, isChatOpen]);

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home, category: 'Main' },
    { name: 'Collection', path: '/collection', icon: LayoutGrid, category: 'Main' },
    { name: 'Store', path: '/store', icon: Store, category: 'Main' },
    { name: 'Market', path: '/marketplace', icon: ShoppingBag, category: 'Main' },
    { name: 'Profile', path: '/profile', icon: UserIcon, category: 'Main' },
    
    { name: 'Notifications', path: '/notifications', icon: Bell, category: 'Social' },
    { name: 'Rare Pulls', path: '/rare-pulls', icon: Crown, category: 'Social' },
    { name: 'Global Chat', path: '#chat', icon: MessageSquare, category: 'Social', onClick: (e: any) => { e.preventDefault(); setIsChatOpen(true); } },
    { name: 'Social', path: '/social', icon: Users, category: 'Social' },
    { name: 'Trades', path: '/trades', icon: ArrowRightLeft, category: 'Social' },
    
    { name: 'Quests', path: '/quests', icon: Target, category: 'Progression' },
    { name: 'Achievements', path: '/achievements', icon: Award, category: 'Progression' },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy, category: 'Progression' },
    { name: 'Season Pass', path: '/season-pass', icon: Gift, category: 'Progression' },
    
    { name: 'How to Play', path: '/how-to-play', icon: BookOpen, category: 'Help' },
    { name: 'Changelog', path: '/changelog', icon: History, category: 'Help' },
    
    { name: 'Settings', path: '/settings', icon: SettingsIcon, category: 'System' },
  ];

  const primaryNav = navItems.slice(0, 5);
  const secondaryNav = navItems.slice(5);

  const groupedSecondaryNav = secondaryNav.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  if (user && !profile && !profileLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-8 shadow-[8px_8px_0px_0px_var(--border)] text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase mb-2">Profile Not Found</h2>
          <p className="text-slate-600 font-bold mb-6">We couldn't load your profile. Please try refreshing or signing out and back in.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => fetchProfile()}
              className="px-6 py-3 bg-blue-500 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-transform"
            >
              Try Again
            </button>
            <button 
              onClick={handleSignOut}
              className="px-6 py-3 bg-red-500 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-transform"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-red-400/30">
      {!isOnline && (
        <div className="bg-yellow-400 text-black px-4 py-2 text-center font-black uppercase text-xs border-b-4 border-black z-[100] sticky top-0">
          ⚠️ You are currently offline. Some features may be unavailable.
        </div>
      )}
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b-4 border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-500 border-2 border-[var(--border)] flex items-center justify-center font-black text-white shadow-[2px_2px_0px_0px_var(--border)]">
              F
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block uppercase">Frycards</span>
          </div>

          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 bg-yellow-100 px-3 py-1.5 rounded-full border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-bold font-mono text-black">{profileLoading ? '...' : (profile?.gold_balance?.toLocaleString() || 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-full border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]">
                <Gem className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold font-mono text-black">{profileLoading ? '...' : (profile?.gem_balance?.toLocaleString() || 0)}</span>
              </div>
              <div className="hidden min-[400px]:flex">
                <Link 
                  to="/store?tab=spark"
                  className="flex items-center gap-1.5 bg-indigo-100 px-3 py-1.5 rounded-full border-2 border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)] hover:bg-indigo-200 transition-colors"
                  title="Pack Points / Spark"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold font-mono text-black">{profileLoading ? '...' : (profile?.pack_points?.toLocaleString() || 0)}</span>
                </Link>
              </div>
              <Link 
                to="/notifications"
                className="relative p-2 hover:bg-blue-100 rounded-full transition-colors text-[var(--text)] border-2 border-transparent hover:border-[var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)]"
                aria-label="Notifications"
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
                onClick={() => { setIsChatOpen(!isChatOpen); if(!isChatOpen) useChatStore.getState().resetUnread(); }}
                className={cn(
                  "p-2 rounded-full transition-all border-2 relative",
                  isChatOpen 
                    ? "bg-blue-400 text-black border-[var(--border)] shadow-[2px_2px_0px_0px_var(--border)]" 
                    : "hover:bg-blue-100 text-[var(--text)] border-transparent hover:border-[var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)]"
                )}
                aria-label="Global Chat"
                title="Global Chat"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadChatCount > 0 && !isChatOpen && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[var(--border)]">
                    {unreadChatCount > 9 ? '!' : unreadChatCount}
                  </span>
                )}
              </button>
              <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-red-100 rounded-full transition-colors text-[var(--text)] border-2 border-transparent hover:border-[var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)]"
                aria-label="Sign Out"
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
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2 relative",
                        isActive 
                          ? "bg-blue-400 text-black border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] font-bold border-l-8" 
                          : "text-[var(--text)] hover:text-black hover:bg-blue-50 border-transparent hover:border-[var(--border)] hover:shadow-[4px_4px_0px_0px_var(--border)] font-medium opacity-80 hover:opacity-100"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive && "text-black")} />
                      <span>{item.name}</span>
                      {item.path === '/collection' && newCardCount > 0 && (
                        <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--border)] animate-pulse">
                          {newCardCount > 99 ? '99+' : newCardCount}
                        </span>
                      )}
                      {item.path === '/trades' && pendingTradeCount > 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--border)] animate-pulse">
                          {pendingTradeCount > 99 ? '99+' : pendingTradeCount}
                        </span>
                      )}
                      {item.path === '/social' && pendingSocialCount > 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--border)] animate-pulse">
                          {pendingSocialCount > 99 ? '99+' : pendingSocialCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-nav-safe md:pb-8 overflow-x-hidden">
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
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                    isActive ? "text-blue-600 font-bold" : "text-[var(--text)] opacity-70 hover:opacity-100"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-blue-600")} />
                  <span className="text-[10px]">{item.name}</span>
                  {item.path === '/collection' && newCardCount > 0 && (
                    <span className="absolute top-2 right-4 bg-blue-500 text-white text-[8px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-[var(--border)]">
                      {newCardCount > 9 ? '!' : newCardCount}
                    </span>
                  )}
                </Link>
              );
            })}
            
            {/* Folded Chat into More drawer, removed specific Chat icon from bottom nav if needed, but let's just make sure More is clear */}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                isMobileMenuOpen ? "text-blue-600 font-bold" : "text-[var(--text)] opacity-70 hover:opacity-100"
              )}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-blue-600" /> : <Menu className="w-5 h-5" />}
              <span className="text-[10px]">More</span>
              {!isMobileMenuOpen && (unreadCount > 0 || unreadChatCount > 0) && (
                <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-[var(--border)]">
                  !
                </span>
              )}
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
                      const isChat = item.path === '#chat';
                      
                      return (
                        <button
                          key={item.path}
                          onClick={(e) => {
                            if (isChat) {
                              setIsChatOpen(true);
                              setUnreadChatCountZustand(0);
                            } else {
                              navigate(item.path);
                            }
                            setIsMobileMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2 w-full text-left",
                            isActive 
                              ? "bg-blue-400 text-black border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] font-bold border-l-8" 
                              : "text-[var(--text)] hover:text-black hover:bg-blue-50 border-transparent hover:border-[var(--border)] font-medium"
                          )}
                        >
                          <div className="relative">
                            <Icon className={cn("w-5 h-5", isActive && "text-black")} />
                            {isChat && unreadChatCount > 0 && (
                               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-[var(--border)]">
                                 !
                               </span>
                            )}
                          </div>
                          <span className="text-sm">{item.name}</span>
                        </button>
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
