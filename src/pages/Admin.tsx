import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Shield, Users, Package, Target, Settings, Plus, Edit2, Trash2, Search, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';

type AdminTab = 'users' | 'cards' | 'packs' | 'quests' | 'shop';

export function Admin() {
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (profile?.is_admin) {
      fetchData();
    }
  }, [profile, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query;
      switch (activeTab) {
        case 'users':
          query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
          break;
        case 'cards':
          query = supabase.from('cards').select('*').order('rarity', { ascending: true });
          break;
        case 'packs':
          query = supabase.from('pack_types').select('*').order('price_gold', { ascending: true });
          break;
        case 'quests':
          query = supabase.from('quest_templates').select('*');
          break;
        case 'shop':
          query = supabase.from('shop_items').select('*');
          break;
      }

      if (query) {
        const { data: result, error } = await query;
        if (error) throw error;
        setData(result || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const filteredData = data.filter(item => {
    const searchLower = search.toLowerCase();
    if (activeTab === 'users') return item.username?.toLowerCase().includes(searchLower) || item.email?.toLowerCase().includes(searchLower);
    if (activeTab === 'cards') return item.name?.toLowerCase().includes(searchLower) || item.rarity?.toLowerCase().includes(searchLower);
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-4xl font-black text-[var(--text)] uppercase tracking-tight flex items-center gap-3">
          <Shield className="w-10 h-10 text-red-500" />
          Admin Control
        </h1>
        
        <div className="flex gap-2">
          <button 
            onClick={() => toast.error('Creation not implemented in this view')}
            className="px-4 py-2 bg-blue-500 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'cards', label: 'Cards', icon: Package },
          { id: 'packs', label: 'Packs', icon: Package },
          { id: 'quests', label: 'Quests', icon: Target },
          { id: 'shop', label: 'Shop', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={cn(
              "px-6 py-3 rounded-xl font-black uppercase text-sm border-4 transition-all flex items-center gap-2 shrink-0",
              activeTab === tab.id 
                ? "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                : "bg-[var(--surface)] text-slate-500 border-[var(--border)] hover:border-slate-400"
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Stats */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg)] border-4 border-[var(--border)] rounded-xl text-sm font-bold focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
            />
          </div>
          <div className="flex items-center gap-4 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-xs font-black text-blue-600 uppercase">Total Items</p>
            <p className="text-xl font-black text-blue-800">{data.length}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-bold">No items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-4 border-[var(--border)]">
                  <th className="p-4 font-black uppercase text-xs text-slate-500">Info</th>
                  <th className="p-4 font-black uppercase text-xs text-slate-500">Details</th>
                  <th className="p-4 font-black uppercase text-xs text-slate-500">Status</th>
                  <th className="p-4 font-black uppercase text-xs text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[var(--border)]">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border-2 border-[var(--border)] flex items-center justify-center font-black text-slate-400">
                          {activeTab === 'users' ? <Users className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-[var(--text)]">{item.username || item.name || item.title || 'Unnamed'}</p>
                          <p className="text-[10px] font-bold text-slate-400 font-mono">{item.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-600">
                        {activeTab === 'users' && <p>{item.email} • Lvl {item.level}</p>}
                        {activeTab === 'cards' && <p>{item.rarity} • {item.element_type}</p>}
                        {activeTab === 'packs' && <p>{item.price_gold} Gold • {item.price_gems} Gems</p>}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase border-2",
                        activeTab === 'users' && item.is_admin ? "bg-red-100 text-red-600 border-red-200" : "bg-green-100 text-green-600 border-green-200"
                      )}>
                        {activeTab === 'users' ? (item.is_admin ? 'Admin' : 'User') : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-blue-100 rounded-lg border-2 border-transparent hover:border-blue-200 transition-all">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-2 hover:bg-red-100 rounded-lg border-2 border-transparent hover:border-red-200 transition-all">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
