import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Shield, ShieldAlert, Zap, Coins, Gem, Loader2, Sparkles, Plus, Search, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export function Admin() {
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<'resources' | 'users' | 'system'>('resources');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [resourceAmount, setResourceAmount] = useState(1000);
  const [resourceType, setResourceType] = useState<'gold' | 'gems' | 'pack_points'>('gold');
  const [users, setUsers] = useState<any[]>([]);

  if (!profile?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h1 className="text-3xl font-black uppercase text-red-500">Access Denied</h1>
        <p className="text-slate-500 font-bold">You do not have administrative privileges.</p>
      </div>
    );
  }

  const handleGrantResources = async () => {
    if (!targetUserId) {
      toast.error('User ID is required');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_grant_resources', {
        p_user_id: targetUserId,
        p_amount: resourceAmount,
        p_resource_type: resourceType
      });
      if (error) throw error;
      toast.success(`Granted ${resourceAmount} ${resourceType} to ${targetUserId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant resources');
    } finally {
      setLoading(false);
    }
  };

  const handleSetAdmin = async (userId: string, status: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_set_admin_status', {
        p_user_id: userId,
        p_is_admin: status
      });
      if (error) throw error;
      toast.success(status ? 'Admin status granted' : 'Admin status revoked');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update admin status');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .limit(20);
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Shield className="w-10 h-10 text-red-500" />
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Admin Panel</h1>
      </div>

      <div className="flex gap-4 border-b-4 border-[var(--border)] overflow-x-auto scrollbar-hide">
        {(['resources', 'users', 'system'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 font-black uppercase rounded-t-xl border-t-4 border-l-4 border-r-4 border-[var(--border)] transition-all",
              activeTab === tab ? "bg-[var(--surface)] text-[var(--text)] translate-y-1" : "bg-slate-100 text-slate-500"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Grant Resources
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Target User ID</label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="uuid-here..."
                  className="w-full px-4 py-2 bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Amount</label>
                  <input
                    type="number"
                    value={resourceAmount}
                    onChange={(e) => setResourceAmount(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Type</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as any)}
                    className="w-full px-4 py-2 bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl font-bold"
                  >
                    <option value="gold">Gold</option>
                    <option value="gems">Gems</option>
                    <option value="pack_points">Pack Points</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGrantResources}
                disabled={loading}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-1"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Execute Grant'}
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-lg font-black uppercase text-xs transition-transform active:translate-y-0.5">
                Reset Energy (All Users)
              </button>
              <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-lg font-black uppercase text-xs transition-transform active:translate-y-0.5">
                Refresh Shop Stock
              </button>
              <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-lg font-black uppercase text-xs transition-transform active:translate-y-0.5">
                Broadcast System Message
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search usernames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl font-bold"
              />
            </div>
            <button
              onClick={fetchUsers}
              className="px-6 py-2 bg-blue-500 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Search
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-4 border-[var(--border)]">
                  <th className="text-left py-3 font-black uppercase text-xs text-slate-400 p-2">User</th>
                  <th className="text-left py-3 font-black uppercase text-xs text-slate-400 p-2">ID</th>
                  <th className="text-left py-3 font-black uppercase text-xs text-slate-400 p-2">Status</th>
                  <th className="text-right py-3 font-black uppercase text-xs text-slate-400 p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b-2 border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 p-2">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-200 border-2 border-black overflow-hidden">
                           {u.avatar_url && <img src={u.avatar_url} className="w-full h-full object-cover" />}
                         </div>
                         <span className="font-black text-sm">{u.username}</span>
                       </div>
                    </td>
                    <td className="py-4 p-2 font-mono text-[10px] text-slate-400">{u.id}</td>
                    <td className="py-4 p-2">
                      {u.is_admin ? (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-red-200">Admin</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-slate-200">User</span>
                      )}
                    </td>
                    <td className="py-4 p-2 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button
                           onClick={() => setTargetUserId(u.id)}
                           className="p-2 hover:bg-slate-100 rounded-lg text-blue-500 transition-colors"
                           title="Grant Resources"
                         >
                           <Zap className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => handleSetAdmin(u.id, !u.is_admin)}
                           className={cn("p-2 rounded-lg transition-colors", u.is_admin ? "text-red-500" : "text-slate-400")}
                           title={u.is_admin ? "Revoke Admin" : "Grant Admin"}
                         >
                           <Shield className="w-4 h-4" />
                         </button>
                         <button className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
           <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Maintenance Mode
              </h2>
              <div className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                 <div>
                    <p className="font-black text-orange-950 uppercase">Maintenance Mode is Off</p>
                    <p className="text-xs text-orange-700 font-bold italic">When active, only admins can log into the game.</p>
                 </div>
                 <button className="px-6 py-2 bg-orange-500 text-white font-black rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase text-xs">
                    Enable
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-100 border-4 border-green-200 rounded-2xl p-6">
                 <h4 className="text-sm font-black uppercase text-green-700 mb-2">Database Status</h4>
                 <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-xl font-black text-green-900">HEALTHY</span>
                 </div>
              </div>
              <div className="bg-blue-100 border-4 border-blue-200 rounded-2xl p-6">
                 <h4 className="text-sm font-black uppercase text-blue-700 mb-2">Active Users</h4>
                 <div className="flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-xl font-black text-blue-900">42</span>
                 </div>
              </div>
              <div className="bg-purple-100 border-4 border-purple-200 rounded-2xl p-6">
                 <h4 className="text-sm font-black uppercase text-purple-700 mb-2">Server Load</h4>
                 <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <span className="text-xl font-black text-purple-900">12%</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
