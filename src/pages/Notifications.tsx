import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Bell, Check, X, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { MessageSquare, UserPlus, ShoppingCart, Trophy, Info, Coins, ArrowRightLeft } from 'lucide-react';

const NOTIFICATION_TYPES: Record<string, { icon: any, color: string, bg: string }> = {
  trade_offer: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100' },
  friend_request: { icon: UserPlus, color: 'text-green-500', bg: 'bg-green-100' },
  marketplace_sale: { icon: ShoppingCart, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  marketplace_purchase: { icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  auction_won: { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  auction_sold: { icon: Coins, color: 'text-amber-500', bg: 'bg-amber-100' },
  achievement: { icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-100' },
  trade_accepted: { icon: Check, color: 'text-green-500', bg: 'bg-green-100' },
  trade_declined: { icon: X, color: 'text-red-500', bg: 'bg-red-100' },
  default: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-100' },
};

export function Notifications() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const PAGE_SIZE = 20;

  const filteredNotifications = notifications.filter(n => {
    if (unreadOnly && n.is_read) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'trade') return n.type?.includes('trade');
    if (activeFilter === 'auction') return n.type?.includes('auction') || n.type?.includes('marketplace');
    if (activeFilter === 'friend') return n.type === 'friend_request';
    if (activeFilter === 'achievement') return n.type === 'achievement';
    return true;
  });

  const deleteAllNotifications = async () => {
    try {
      const { error } = await supabase.rpc('delete_all_notifications');
      if (error) throw error;
      setNotifications([]);
      setHasMore(false);
      toast.success('All notifications cleared');
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      toast.error('Failed to clear notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchNotifications = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const nextOffset = isLoadMore ? notifications.length : 0;

      const { data, error } = await supabase.rpc('get_notifications', { 
        p_limit: PAGE_SIZE, 
        p_offset: nextOffset 
      });
      if (error) throw error;
      
      const fetched = data || [];
      if (isLoadMore) {
        setNotifications(prev => [...prev, ...fetched]);
      } else {
        setNotifications(fetched);
      }

      setHasMore(fetched.length === PAGE_SIZE);
      setOffset(nextOffset + fetched.length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_notifications_read');
      if (error) throw error;
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.rpc('mark_notifications_read', { p_ids: [id] });
      if (error) throw error;
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-500" />
          Notifications
        </h1>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button 
              onClick={deleteAllNotifications}
              className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-black rounded-xl border-4 border-black transition-all active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
              title="Clear all notifications"
            >
              <Trash2 className="w-5 h-5" />
              <span className="uppercase tracking-tight text-sm hidden sm:inline">Clear All</span>
            </button>
          )}
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={markAllAsRead}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black rounded-xl border-4 border-black transition-all active:translate-y-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 group"
            >
              <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />
              <span className="uppercase tracking-tight text-lg">Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'All', icon: Bell },
          { id: 'trade', label: 'Trades', icon: ArrowRightLeft },
          { id: 'auction', label: 'Marketplace', icon: ShoppingCart },
          { id: 'friend', label: 'Social', icon: UserPlus },
          { id: 'achievement', label: 'Achievements', icon: Trophy },
        ].map(chip => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={cn(
                "px-4 py-2 rounded-xl font-black uppercase text-sm border-4 transition-all flex items-center gap-2",
                activeFilter === chip.id 
                  ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_black]" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-black"
              )}
            >
              <Icon className="w-4 h-4" />
              {chip.label}
            </button>
          );
        })}
        
        <div className="flex-1" />
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={cn(
            "px-4 py-2 rounded-xl font-black uppercase text-sm border-4 transition-all flex items-center gap-2",
            unreadOnly 
              ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_black]" 
              : "bg-white text-slate-500 border-slate-200 hover:border-black"
          )}
        >
          <Bell className="w-4 h-4" />
          Unread Only
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="w-20 h-20 mx-auto bg-[var(--bg)] rounded-full flex items-center justify-center mb-4 border-4 border-[var(--border)]">
            <Bell className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-[var(--text)] uppercase mb-2">All Caught Up</h2>
          <p className="text-slate-500 font-bold">You have no new notifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border-4 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-bold uppercase">No notifications match this filter</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <motion.div 
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={async () => {
                  if (!notification.is_read) {
                    await markAsRead(notification.id);
                  }
                  if (notification.action_url) {
                    navigate(notification.action_url);
                  }
                }}
                className={cn(
                  "p-4 rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] flex items-start gap-4 transition-colors cursor-pointer group",
                  notification.is_read ? "bg-[var(--bg)] opacity-75" : "bg-[var(--surface)] hover:bg-blue-50"
                )}
              >
                {(() => {
                  const type = notification.type || 'default';
                  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.default;
                  const Icon = config.icon;
                  
                  return (
                    <div className={cn(
                      "w-12 h-12 rounded-full border-2 border-black flex items-center justify-center shrink-0",
                      notification.is_read ? "bg-gray-200" : config.bg
                    )}>
                      <Icon className={cn("w-6 h-6", notification.is_read ? "text-slate-400" : config.color)} />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-black text-lg uppercase truncate group-hover:text-blue-600 transition-colors">{notification.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 font-bold mt-1">{notification.body}</p>
                  {notification.action_url && (
                    <div className="inline-flex items-center gap-1 mt-3 text-sm font-black text-blue-600 uppercase">
                      View Details <ExternalLink className="w-4 h-4" />
                    </div>
                  )}
                </div>
                {!notification.is_read && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5 text-slate-400 hover:text-black" />
                  </button>
                )}
              </motion.div>
            ))
          )}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={loadingMore}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] disabled:opacity-50 transition-all active:translate-y-1"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  'Load More Notifications'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
