import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_notifications', { p_limit: 50, p_offset: 0 });
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
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
        <h1 className="text-4xl font-black text-black tracking-tight uppercase flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-500" />
          Notifications
        </h1>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllAsRead}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-black">
            <Bell className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-black uppercase mb-2">All Caught Up</h2>
          <p className="text-slate-500 font-bold">You have no new notifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <motion.div 
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-4 transition-colors",
                notification.is_read ? "bg-gray-50" : "bg-white"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full border-2 border-black flex items-center justify-center shrink-0",
                notification.is_read ? "bg-gray-200" : "bg-blue-100"
              )}>
                <Bell className={cn("w-6 h-6", notification.is_read ? "text-slate-400" : "text-blue-500")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-black text-lg uppercase truncate">{notification.title}</h3>
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 font-bold mt-1">{notification.body}</p>
                {notification.action_url && (
                  <a 
                    href={notification.action_url}
                    className="inline-flex items-center gap-1 mt-3 text-sm font-black text-blue-600 hover:text-blue-800 uppercase"
                  >
                    View Details <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {!notification.is_read && (
                <button 
                  onClick={() => markAsRead(notification.id)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-5 h-5 text-slate-400 hover:text-black" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
