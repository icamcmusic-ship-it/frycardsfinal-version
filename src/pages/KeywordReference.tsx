// src/pages/KeywordReference.tsx
//
// Public reference for all 18 keywords × 3 tiers.
//
// Consumes the keyword_definitions table via `get_keyword_definitions` RPC
// (see 03_rpcs.sql). Falls back to the static KEYWORDS data if the RPC fails.

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, MapPin, Swords, Sparkles, Package, Search, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import { KEYWORDS } from "../lib/dmh/keywords-data"; // fallback

const CATEGORIES = ["All", "Leader", "Location", "Unit", "Event", "Artifact"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ICON: Record<Category, React.ReactNode | null> = {
  All: null,
  Leader: <Crown className="w-4 h-4" />,
  Location: <MapPin className="w-4 h-4" />,
  Unit: <Swords className="w-4 h-4" />,
  Event: <Sparkles className="w-4 h-4" />,
  Artifact: <Package className="w-4 h-4" />,
};

interface KwRow {
  keyword: string;
  tier: 1 | 2 | 3;
  name: string;
  short_description: string;
  rules_text: string;
  example_card_name?: string;
  power_grade?: "S" | "A" | "B" | "C" | "D" | null;
}

export default function KeywordReference() {
  const [data, setData] = useState<KwRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase.rpc("get_keyword_definitions");
      if (error || !rows) {
        toast.error("Failed to fetch glossary. Using minimal set.");
        setData([]);
      } else {
        setData(rows as KwRow[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const m = new Map<string, KwRow[]>();
    for (const r of data) {
      const searchTerm = search.toLowerCase();
      if (search && !r.keyword.toLowerCase().includes(searchTerm) && !r.name.toLowerCase().includes(searchTerm)) continue;
      const k = r.keyword;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    for (const [, rows] of m) rows.sort((a, b) => a.tier - b.tier);
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data, search]);

  function toggle(k: string) {
    setExpanded((cur) => {
      const next = new Set(cur);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto p-6" id="keyword-codex">
      <div className="bg-amber-400 rounded-3xl p-8 mb-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
        <h1 className="text-5xl font-black text-black tracking-tighter uppercase italic">The Shadow Glossary</h1>
        <p className="text-black/80 font-bold mt-2 max-w-xl">Master the keywords of the Shadow Realm. Knowledge is the ultimate weapon in Dead Man's Hand.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8" id="keyword-search-container">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by keyword or name..."
            className="w-full pl-12 pr-4 py-4 bg-white border-4 border-black rounded-2xl font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-0.5 focus:shadow-none transition-all placeholder:text-slate-300"
            id="keyword-search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Search className="w-12 h-12 text-amber-500 animate-pulse" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20 bg-slate-100 rounded-3xl border-4 border-dashed border-slate-300">
          <p className="text-2xl font-black text-slate-400 uppercase italic">No matches in the library</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6" id="keywords-list">
          {grouped.map(([kw, tiers]) => (
            <motion.div 
              key={kw} 
              layout
              className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
              <button
                onClick={() => toggle(kw)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                id={`btn-toggle-${kw}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center rotate-3">
                    <Swords className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight italic">{kw}</h2>
                    <p className="text-slate-500 font-bold">{tiers[0].name}</p>
                  </div>
                </div>
                <div className={cn("transition-transform duration-300", expanded.has(kw) ? "rotate-180" : "")}>
                  <ChevronDown className="w-8 h-8 text-black" />
                </div>
              </button>

              <AnimatePresence>
                {expanded.has(kw) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-slate-50"
                  >
                    <div className="p-6 pt-0 space-y-4 border-t-2 border-black">
                      <div className="bg-white p-4 rounded-xl border-2 border-black mt-4">
                         <p className="text-slate-600 font-medium italic">{tiers[0].short_description}</p>
                      </div>

                      <div className="grid gap-4">
                        {tiers.map((t) => (
                          <div key={t.tier} className="flex gap-4 items-start p-4 bg-white rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="w-10 h-10 bg-amber-400 border-2 border-black rounded-lg flex items-center justify-center font-black text-black rotate-6">
                                {t.tier}
                              </span>
                              {t.power_grade && (
                                <span className={cn(
                                  "text-[10px] font-black px-1.5 py-0.5 rounded border border-black",
                                  t.power_grade === 'S' ? 'bg-red-500 text-white' : 'bg-slate-200 text-black'
                                )}>
                                  {t.power_grade}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-black font-bold leading-tight">{t.rules_text}</p>
                              {t.example_card_name && (
                                <p className="text-[10px] uppercase font-black text-blue-600 mt-2 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> Ex: {t.example_card_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
      
      <div className="mt-12 text-center text-slate-400 font-bold text-sm">
        <p>Values and tiers are subject to balance changes in v1.1</p>
      </div>
    </div>
  );
}
