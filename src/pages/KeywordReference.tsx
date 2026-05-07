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
  category: "Leader" | "Location" | "Unit" | "Event" | "Artifact";
  tier: 1 | 2 | 3;
  effect_text: string;
  trigger: string;
  power_grade: "S" | "A" | "B" | "C" | null;
  anti_synergies: string[];
}

export default function KeywordReference() {
  const [data, setData] = useState<KwRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    const { data: rows, error } = await supabase.rpc("get_keyword_definitions");
    if (error || !rows) {
      // Fallback to client constant
      const fallback: KwRow[] = [];
      for (const kw in KEYWORDS) {
        const entry = KEYWORDS[kw as keyof typeof KEYWORDS];
        for (const tier in entry) {
          const t = entry[tier as unknown as 1|2|3]!;
          fallback.push({
            keyword: t.keyword,
            category: t.category as any,
            tier: t.tier as any,
            effect_text: t.effect_text,
            trigger: t.trigger,
            power_grade: t.power_grade as any,
            anti_synergies: t.anti_synergies as any,
          });
        }
      }
      setData(fallback);
    } else {
      setData(rows as KwRow[]);
    }
    setLoading(false);
  }

  const grouped = useMemo(() => {
    const m = new Map<string, KwRow[]>();
    for (const r of data) {
      if (category !== "All" && r.category !== category) continue;
      if (search && !r.keyword.toLowerCase().includes(search.toLowerCase())) continue;
      const k = r.keyword;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    for (const [, rows] of m) rows.sort((a, b) => a.tier - b.tier);
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data, search, category]);

  function toggle(k: string) {
    setExpanded((cur) => {
      const next = new Set(cur);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto p-6" id="keyword-reference-page">
      <h1 className="text-4xl font-bold text-amber-400 mb-2">Keyword Codex</h1>
      <p className="text-gray-400 mb-6">All keywords, all tiers, all effects.</p>

      <div className="flex flex-wrap gap-2 mb-4" id="keyword-filters">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keyword…"
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded text-white"
            id="keyword-search"
          />
        </div>
        <div className="flex gap-1" id="category-filters">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                category === c
                  ? "bg-amber-500 text-black font-bold"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800"
              }`}
            >{CATEGORY_ICON[c]} {c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400" id="loading-keywords">Loading…</p>
      ) : grouped.length === 0 ? (
        <p className="text-gray-500" id="no-keywords-found">No keywords match.</p>
      ) : (
        <ul className="space-y-2" id="keywords-list">
          {grouped.map(([kw, tiers]) => (
            <li key={kw} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden" id={`keyword-item-${kw}`}>
              <button
                onClick={() => toggle(kw)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  {CATEGORY_ICON[tiers[0].category]}
                  <div className="text-left">
                    <div className="text-amber-300 font-bold">{kw}</div>
                    <div className="text-xs text-gray-400">{tiers[0].category} · {tiers.length} tier{tiers.length > 1 ? "s" : ""}</div>
                  </div>
                </div>
                {expanded.has(kw) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              <AnimatePresence>
                {expanded.has(kw) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-800 px-3 py-2 space-y-3"
                  >
                    {tiers.map((t) => (
                      <div key={t.tier} className="flex gap-3 items-start" id={`keyword-${kw}-tier-${t.tier}`}>
                        <span className="px-2 py-1 rounded bg-amber-700 text-white text-xs font-bold w-12 text-center">
                          T-{t.tier === 1 ? "I" : t.tier === 2 ? "II" : "III"}
                        </span>
                        <div className="flex-1 text-sm text-gray-200">
                          <p>{t.effect_text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Trigger: <span className="text-gray-400">{t.trigger}</span>
                            {t.power_grade && <span className="ml-2">· Power Grade: <span className="text-amber-300">{t.power_grade}</span></span>}
                            {t.anti_synergies.length > 0 && (
                              <span className="ml-2">· Anti-synergy: <span className="text-rose-400">{t.anti_synergies.join(", ")}</span></span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
