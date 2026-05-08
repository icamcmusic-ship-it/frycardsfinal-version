// src/pages/DeckBuilder.tsx
//
// DEAD MAN'S HAND deck builder.
//
// Calls Supabase RPCs from 03_rpcs.sql:
//   - get_my_buildable_cards()  → cards the user owns (with quantity)
//   - list_my_decks()           → list of user's decks
//   - get_deck(deck_id)         → full deck JSON (leader + cards + legality)
//   - upsert_deck(...)          → create or update; returns deck_id
//   - delete_deck(deck_id)      → drop deck
//
// Validation mirrors `_validate_deck()` server-side (1 leader, 19 cards,
// max 1 Location, max 2 copies, must own). Client-side warnings are
// advisory; the RPC re-validates and rejects invalid decks.

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { Trash2, Save, ChevronLeft, Search, Filter, AlertTriangle, Crown, MapPin, Swords, Sparkles, Package, Shield, Info, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

// ──────────────────────────────────────────────────────────────────────────
// TYPES (mirrors 04_types.ts but kept local to avoid pulling engine into UI)
// ──────────────────────────────────────────────────────────────────────────
type CardType = "Leader" | "Location" | "Unit" | "Event" | "Artifact";
type Rarity = "Common" | "Uncommon" | "Rare" | "Super-Rare" | "Mythic" | "Divine";

interface OwnedCard {
  id: string;
  name: string;
  card_type: CardType;
  rarity: Rarity;
  cast_cost: number | null;
  defense: number | null;
  keyword: string | null;
  keyword_tier: 1 | 2 | 3 | null;
  effect_text: string | null;
  image_url: string | null;
  quantity: number;       // unfoil count
  foil_quantity: number;  // foil count (counts toward the same 2-copy limit)
}

interface DeckSummary {
  id: string;
  name: string;
  is_legal: boolean;
  legality_reasons: string[];
  card_count: number;
  updated_at: string;
}

interface DeckDetail {
  id: string;
  name: string;
  format: "standard";
  is_legal: boolean;
  legality_reasons: string[];
  leader: OwnedCard | null;
  cards: OwnedCard[]; // duplicates expanded — array length == 19 when legal
}

const RARITY_COLOR: Record<string, string> = {
  Common: "text-gray-400",
  Uncommon: "text-emerald-500",
  Rare: "text-blue-500",
  'Super-Rare': "text-purple-500",
  Mythic: "text-yellow-500",
  Divine: "text-red-500",
};

const TYPE_ICON: Record<CardType, React.ReactNode> = {
  Leader:   <Crown className="w-4 h-4" />,
  Location: <MapPin className="w-4 h-4" />,
  Unit:     <Swords className="w-4 h-4" />,
  Event:    <Sparkles className="w-4 h-4" />,
  Artifact: <Package className="w-4 h-4" />,
};

// ──────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────
export default function DeckBuilder() {
  const [view, setView] = useState<"list" | "edit">("list");
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [editing, setEditing] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void loadDecks(); }, []);

  async function loadDecks() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_my_decks");
    if (error) {
      toast.error("Failed to load decks: " + error.message);
    } else {
      setDecks((data as DeckSummary[]) ?? []);
    }
    setLoading(false);
  }

  async function openDeck(id: string | null) {
    if (id === null) {
      setEditing({
        id: "",
        name: "New Deck",
        format: "standard",
        is_legal: false,
        legality_reasons: ["Deck has no Leader", "Main deck must be 19 cards (currently 0)"],
        leader: null,
        cards: [],
      });
    } else {
      const { data, error } = await supabase.rpc("get_deck", { p_deck_id: id });
      if (error) return toast.error(error.message);
      setEditing(data as DeckDetail);
    }
    setView("edit");
  }

  async function deleteDeck(id: string) {
    if (!confirm("Delete this deck?")) return;
    const { error } = await supabase.rpc("delete_deck", { p_deck_id: id });
    if (error) return toast.error(error.message);
    toast.success("Deck deleted");
    void loadDecks();
  }

  if (view === "edit" && editing) {
    return (
      <DeckEditor
        deck={editing}
        onSaved={(d) => {
          setEditing(d);
          void loadDecks();
        }}
        onClose={() => { setEditing(null); setView("list"); }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6" id="deck-builder-page">
      <div className="flex items-center justify-between mb-6" id="deck-builder-header">
        <h1 className="text-3xl font-bold text-amber-400">Decks</h1>
        <button
          onClick={() => openDeck(null)}
          className="px-4 py-2 rounded bg-amber-500 text-black font-bold hover:bg-amber-400"
          id="btn-new-deck"
        >+ New Deck</button>
      </div>

      {loading ? (
        <p className="text-gray-400" id="loading-decks">Loading…</p>
      ) : decks.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800" id="empty-decks-state">
          <p className="text-gray-400">You haven't built a deck yet.</p>
          <p className="text-sm text-gray-500 mt-2">A legal Dead Man's Hand deck has 1 Leader + 19 main-deck cards (max 1 Location, max 2 copies).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="decks-grid">
          {decks.map((d) => (
            <motion.div
              key={d.id}
              whileHover={{ y: -2 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer"
              onClick={() => openDeck(d.id)}
              id={`deck-card-${d.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{d.name}</h3>
                  <p className="text-sm text-gray-400">{d.card_count} cards</p>
                </div>
                {d.is_legal ? (
                  <span className="px-2 py-1 rounded text-xs bg-emerald-900 text-emerald-300">Legal</span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs bg-red-900 text-red-300">Illegal</span>
                )}
              </div>
              <div className="mt-2 flex justify-between items-center">
                <p className="text-xs text-gray-500">Updated {new Date(d.updated_at).toLocaleDateString()}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); void deleteDeck(d.id); }}
                  className="text-red-400 hover:text-red-300"
                  id={`btn-delete-deck-${d.id}`}
                ><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Editor
// ──────────────────────────────────────────────────────────────────────────
function DeckEditor({
  deck,
  onSaved,
  onClose,
}: {
  deck: DeckDetail;
  onSaved: (d: DeckDetail) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(deck.name);
  const [leader, setLeader] = useState<OwnedCard | null>(deck.leader);
  const [cards, setCards] = useState<OwnedCard[]>(deck.cards);
  const [collection, setCollection] = useState<OwnedCard[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<CardType | "All">("All");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadCollection();
  }, []);

  async function loadCollection() {
    const { data, error } = await supabase.rpc("get_my_buildable_cards");
    if (error) {
      toast.error("Couldn't load collection: " + error.message);
      return;
    }
    setCollection((data as OwnedCard[]) ?? []);
  }

  // ── live legality check (client mirror of _validate_deck) ────────────────
  const legalityReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!leader) reasons.push("Deck must have exactly 1 Leader");
    if (cards.length < 20) reasons.push(`Main deck must have at least 20 non-Leader cards (currently ${cards.length})`);
    
    const locs = cards.filter((c) => c.card_type === "Location").length;
    if (locs < 1) reasons.push("Deck must contain at least 1 Location");
    
    const dupCounts = cards.reduce<Record<string, number>>((acc, c) => {
      acc[c.id] = (acc[c.id] || 0) + 1;
      return acc;
    }, {});
    
    for (const [cid, n] of Object.entries(dupCounts)) {
      const card = cards.find((c) => c.id === cid)!;
      const isDivine = card.rarity === 'Divine';
      const maxCopies = isDivine ? 1 : 2;
      
      if ((n as number) > maxCopies) {
        reasons.push(`Too many copies of ${card.name} (${n}, max ${maxCopies}${isDivine ? ' for Divine' : ''})`);
      }
    }
    return reasons;
  }, [leader, cards]);

  const isLegal = legalityReasons.length === 0;

  // ── mana curve ──
  const manaCurveData = useMemo(() => {
    const counts = new Array(8).fill(0);
    cards.forEach(c => {
      const cost = c.cast_cost ?? 0;
      const index = Math.min(cost, 7);
      counts[index]++;
    });
    return counts;
  }, [cards]);

  const maxCount = Math.max(...manaCurveData, 1);

  // ── filters ──────────────────────────────────────────────────────────────
  const visibleCollection = useMemo(() => {
    return collection.filter((c) => {
      if (filterType !== "All" && c.card_type !== filterType) return false;
      if (filterType === "All" && c.card_type === "Leader") return false; // leaders picked separately
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      const ownedTotal = c.quantity + c.foil_quantity;
      const inDeck = cards.filter((x) => x.id === c.id).length;
      return inDeck < ownedTotal;
    });
  }, [collection, filterType, search, cards]);

  const leaderOptions = useMemo(
    () => collection.filter((c) => c.card_type === "Leader"),
    [collection],
  );

  // ── add / remove ─────────────────────────────────────────────────────────
  function addCard(card: OwnedCard) {
    const inDeck = cards.filter((c) => c.id === card.id).length;
    const isDivine = card.rarity === 'Divine';
    const limit = isDivine ? 1 : 2;
    
    if (inDeck >= limit) return toast.error(`Max ${limit} cop${limit > 1 ? 'ies' : 'y'} of ${card.name}`);
    setCards([...cards, card]);
  }
  function removeCard(idx: number) {
    setCards(cards.filter((_, i) => i !== idx));
  }

  // ── save ─────────────────────────────────────────────────────────────────
  async function save() {
    if (!leader) return toast.error("Pick a Leader first");
    setSaving(true);
    const { data, error } = await supabase.rpc("upsert_deck", {
      p_deck_id: deck.id || null,
      p_name: name,
      p_leader_id: leader.id,
      p_card_ids: cards.map((c) => c.id),
      p_format: "standard",
    });
    setSaving(false);
    if (error) return toast.error("Save failed: " + error.message);
    toast.success("Deck saved");
    // Re-fetch with the now-known id
    const newId = (data as string) || deck.id;
    const { data: fresh } = await supabase.rpc("get_deck", { p_deck_id: newId });
    if (fresh) onSaved(fresh as DeckDetail);
  }

  return (
    <div className="max-w-7xl mx-auto p-6" id="deck-editor">
      <div className="flex items-center gap-3 mb-4" id="deck-editor-header">
        <button onClick={onClose} className="text-gray-400 hover:text-white" id="btn-close-editor">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-2xl bg-transparent border-b border-gray-800 focus:border-amber-500 outline-none text-white"
          id="deck-name-input"
        />
        <span className={`px-2 py-1 rounded text-xs ${isLegal ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`} id="deck-status-badge">
          {cards.length} cards · {isLegal ? "Legal" : "Illegal"}
        </span>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 rounded bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center gap-2"
          id="btn-save-deck"
        ><Save className="w-4 h-4" /> Save</button>
      </div>

      {!isLegal && (
        <div className="bg-red-900/30 border-4 border-red-500 rounded-2xl p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] transform -rotate-1" id="legality-warnings">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-black text-red-500 uppercase italic">⚠️ Tournament Illegal Deck</h3>
              <ul className="text-sm text-red-200 font-bold mt-1 list-none">
                {legalityReasons.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="deck-editor-main">
        {/* ── Deck panel ── */}
        <div className="lg:col-span-1 bg-gray-950 border border-gray-800 rounded-xl p-4 max-h-[80vh] overflow-y-auto" id="deck-panel">
          <h2 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4" /> Leader
          </h2>
          {leader ? (
            <div className="bg-gray-900 rounded p-2 mb-4 flex justify-between items-center" id={`leader-in-deck-${leader.id}`}>
              <span className="text-white">{leader.name}</span>
              <button onClick={() => setLeader(null)} className="text-gray-400 hover:text-red-400" id="btn-remove-leader">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <select
              value=""
              onChange={(e) => {
                const c = leaderOptions.find((c) => c.id === e.target.value);
                if (c) setLeader(c);
              }}
              className="w-full bg-gray-900 text-white rounded p-2 mb-4 border border-gray-800"
              id="leader-select"
            >
              <option value="">— pick a Leader —</option>
              {leaderOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <h2 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
            Main Deck ({cards.length})
          </h2>
          <div className="space-y-1" id="main-deck-list">
            <AnimatePresence>
              {cards.map((c, idx) => (
                <motion.div
                  key={`${c.id}-${idx}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2 bg-gray-900 rounded p-2"
                  id={`card-in-deck-${c.id}-${idx}`}
                >
                  {TYPE_ICON[c.card_type]}
                  <span className={`flex-1 truncate text-sm font-bold ${RARITY_COLOR[c.rarity]}`}>{c.name}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-black">{c.cast_cost ?? "0"}</span>
                  <button onClick={() => removeCard(idx)} className="text-gray-500 hover:text-red-400 p-1" id={`btn-remove-card-${idx}`}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-8 bg-gray-900/50 border-2 border-gray-800 rounded-xl p-4" id="mana-curve-chart">
            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" /> Mana Curve
            </h3>
            <div className="flex items-end justify-between h-24 gap-1">
              {manaCurveData.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div 
                    className={cn(
                      "w-full rounded-t-sm transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                      count === 0 ? "bg-gray-800/20" : "bg-blue-500 group-hover:bg-blue-400"
                    )}
                    style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                  />
                  <span className="text-[8px] font-black text-gray-600 group-hover:text-gray-400">{i === 7 ? '7+' : i}</span>
                  {count > 0 && (
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-0.5 rounded text-[10px] font-black z-50 pointer-events-none">
                      {count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Collection panel ── */}
        <div className="lg:col-span-2 bg-gray-950 border border-gray-800 rounded-xl p-4 max-h-[80vh] overflow-y-auto" id="collection-panel">
          <div className="flex gap-2 mb-3" id="collection-filters">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search collection…"
                className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded text-white"
                id="collection-search"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as CardType | "All")}
              className="bg-gray-900 border border-gray-800 rounded px-3 text-white"
              id="type-filter"
            >
              <option value="All">All</option>
              <option value="Unit">Units</option>
              <option value="Event">Events</option>
              <option value="Artifact">Artifacts</option>
              <option value="Location">Locations</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2" id="collection-grid">
            {visibleCollection.map((c) => {
              const inDeck = cards.filter((x) => x.id === c.id).length;
              const owned = c.quantity + c.foil_quantity;
              return (
                <button
                  key={c.id}
                  onClick={() => addCard(c)}
                  className="text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded p-2 text-sm transition"
                  id={`collection-card-${c.id}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      {TYPE_ICON[c.card_type]}
                      <span className={cn("font-bold", RARITY_COLOR[c.rarity])}>{c.name}</span>
                    </span>
                    <span className="text-xs text-gray-500">{inDeck}/{Math.min(2, owned)}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex flex-wrap gap-x-2 gap-y-1 items-center">
                    {c.cast_cost !== null && (
                      <span className="bg-white text-black border-2 border-black px-1.5 rounded-lg font-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                        {c.cast_cost}
                      </span>
                    )}
                    {c.defense !== null && (c.card_type === 'Unit' || c.card_type === 'Artifact') && (
                      <span className="bg-blue-600 text-white border-2 border-black px-1.5 rounded-lg flex items-center gap-0.5 font-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                        <Shield className="w-2.5 h-2.5" /> {c.defense}
                      </span>
                    )}
                    {c.keyword && (
                      <span className="text-yellow-400 font-black uppercase text-[8px] bg-black border border-yellow-400 px-1 rounded shadow-[1px_1px_0px_rgba(255,255,0,0.2)]">
                        {c.keyword} {romanize(c.keyword_tier)}
                      </span>
                    )}
                    {c.effect_text && (
                      <div className="group/effect relative ml-auto">
                        <Info className="w-3.5 h-3.5 text-blue-400 cursor-help hover:text-blue-300" />
                        <div className="absolute bottom-full right-0 mb-3 w-56 p-3 bg-black/95 text-white text-[11px] font-bold rounded-xl border-2 border-slate-700 hidden group-hover/effect:block z-[60] shadow-2xl backdrop-blur-sm">
                          <p className="text-yellow-400 uppercase text-[9px] font-black mb-1">{c.keyword || 'Ability'}</p>
                          {c.effect_text}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            {visibleCollection.length === 0 && (
              <p className="col-span-full text-center text-gray-500 py-8" id="no-cards-found">No cards match.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function romanize(t: 1 | 2 | 3 | null) {
  return t === 1 ? "I" : t === 2 ? "II" : t === 3 ? "III" : "";
}
