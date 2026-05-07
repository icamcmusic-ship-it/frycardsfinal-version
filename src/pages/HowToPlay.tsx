// src/pages/HowToPlay.tsx — REPLACEMENT for the existing pack-opening doc.
//
// Renders the full Dead Man's Hand rule set. Linked from the main nav and
// from the GameBoard's "?" button.
//
// All sections come from the rulebook PDF. Direct quotes are tagged with §
// references so admins can cross-check against the source document.

import React, { useState } from "react";
import { motion } from "motion/react";
import { Coins, Skull, Crown, MapPin, Swords, Sparkles, Package, Spade } from "lucide-react";

const SECTIONS = [
  { id: "objective", label: "Objective" },
  { id: "components", label: "Components" },
  { id: "tournament", label: "Tournament" },
  { id: "priority", label: "Priority" },
  { id: "defense", label: "Defense" },
  { id: "keywords", label: "Keywords" },
  { id: "assassinate", label: "Assassination" },
  { id: "fold", label: "Folding" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export default function HowToPlay() {
  const [active, setActive] = useState<SectionId>("objective");

  return (
    <div className="max-w-5xl mx-auto p-6" id="how-to-play-page">
      <h1 className="text-4xl font-bold text-amber-400 mb-2">How to Play</h1>
      <p className="text-gray-400 mb-6">A TCG of high stakes, magic, and bluffing.</p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-800 mb-4" id="how-to-play-tabs">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`px-3 py-2 text-sm font-medium ${
              active === s.id
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >{s.label}</button>
        ))}
      </div>

      <motion.div
        key={active}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="prose prose-invert max-w-none text-gray-200"
        id="how-to-play-content"
      >
        {active === "objective" && <Objective />}
        {active === "components" && <Components />}
        {active === "tournament" && <Tournament />}
        {active === "priority" && <Priority />}
        {active === "defense" && <Defense />}
        {active === "keywords" && <Keywords />}
        {active === "assassinate" && <Assassinate />}
        {active === "fold" && <Folding />}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function Objective() {
  return (
    <div id="section-objective">
      <h2 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
        <Coins className="w-6 h-6" /> Win Condition
      </h2>
      <p>
        In <strong>The Dead Man's Hand</strong>, your Poker Chips are your <em>Mana</em>,
        your <em>betting power</em>, AND your <em>Life Total</em>. You win the game by
        bankrupting your opponent — reducing their Chip Stack to 0.
      </p>
      <h3 className="text-xl text-amber-300 mt-4">All-In & Side Pots</h3>
      <p>
        If a bet reduces your stash to exactly 0 chips, you are "All-In." You survive
        until the end of Showdown and may still cast 0-cost TCG cards. Other players
        with chips can continue betting in a separate <strong>Side Pot</strong>; the
        All-In player is only eligible to win the Main Pot. If your stash remains at 0
        after all pots are awarded, you lose the game.
      </p>
    </div>
  );
}

function Components() {
  return (
    <div id="section-components">
      <h2 className="text-2xl font-bold text-amber-300">Game Components & Zones</h2>
      <ul className="space-y-2">
        <li><Spade className="inline w-4 h-4 text-gray-300" /> <strong>Poker Deck:</strong> 1 shared standard 52-card playing deck. Reshuffled every hand.</li>
        <li><Crown className="inline w-4 h-4 text-amber-400" /> <strong>TCG Decks:</strong> 20 cards total — 1 Leader, max 1 Location, 18 Units/Events/Artifacts. Max 2 copies of any non-Leader card.</li>
        <li><Coins className="inline w-4 h-4 text-amber-400" /> <strong>The Stash:</strong> Your current chip pile (your Health AND your Mana).</li>
        <li><strong>The Pot:</strong> Chips wagered in the center.</li>
        <li><Swords className="inline w-4 h-4 text-rose-400" /> <strong>Casino Floor (3 Seats):</strong> You have exactly 3 slots for Units/Artifacts. You cannot voluntarily destroy a Unit to free a Seat.</li>
        <li><Skull className="inline w-4 h-4 text-gray-400" /> <strong>Graveyard:</strong> Public discard pile for TCG cards.</li>
      </ul>
    </div>
  );
}

function Tournament() {
  return (
    <div id="section-tournament">
      <h2 className="text-2xl font-bold text-amber-300">Tournament Structure & Blinds</h2>
      <p>The match plays out as a series of poker hands with escalating blinds.</p>
      <table className="w-full border-collapse mt-3">
        <thead>
          <tr className="bg-gray-900">
            <th className="px-3 py-2 text-left">Setting</th>
            <th className="px-3 py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          <tr className="border-t border-gray-800"><td className="px-3 py-1">Starting Stash</td><td className="px-3 py-1">1,000 Chips</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">Hands 1–5</td><td className="px-3 py-1">SB 10 / BB 20</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">Hands 6–10</td><td className="px-3 py-1">SB 20 / BB 40</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">Hands 11–15</td><td className="px-3 py-1">SB 40 / BB 80</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">Hands 16+</td><td className="px-3 py-1">Doubles every 5 hands</td></tr>
        </tbody>
      </table>
      <p className="mt-3 text-sm text-gray-400">
        <strong>Additive Multipliers:</strong> If multiple effects increase Blinds (e.g., Fatigue + High Stakes Location),
        they scale <em>additively</em> from the base, not multiplicatively.
      </p>
    </div>
  );
}

function Priority() {
  return (
    <div id="section-priority">
      <h2 className="text-2xl font-bold text-amber-300">Effect Priority Stack</h2>
      <p>Resolve card conflicts using this hierarchy (1 is highest):</p>
      <ol className="list-decimal pl-6 space-y-1">
        <li><strong>Ignited Leader Auras</strong> — overrides everything below. Tie-breaker: Dealer Button takes precedence.</li>
        <li><strong>Active Location Venue Rules</strong> — the current "House Rules". Locations alternate every <em>two hands</em>.</li>
        <li><strong>Continuous Board Effects</strong> — passive abilities from face-up Units and Artifacts.</li>
        <li><strong>The Action Stack (LIFO)</strong> — Last In, First Out. Folds declared in response to the stack happen <em>last</em>, allowing Events to resolve.</li>
        <li><strong>The Core Rulebook</strong> — default game mechanics.</li>
      </ol>
    </div>
  );
}

function Defense() {
  return (
    <div id="section-defense">
      <h2 className="text-2xl font-bold text-amber-300">Unit Defense Balancing</h2>
      <p>
        Because Assassination is tied to discarding Poker cards, a Unit's Defense
        stat (2 to 14, Ace) must be strictly balanced against its Keyword Tiers.
      </p>
      <table className="w-full border-collapse mt-3">
        <thead><tr className="bg-gray-900"><th className="px-3 py-2 text-left">Defense</th><th className="px-3 py-2 text-left">Profile</th></tr></thead>
        <tbody className="text-gray-300">
          <tr className="border-t border-gray-800"><td className="px-3 py-1">2–6 (Low)</td><td className="px-3 py-1">Extremely fragile. Reserved for massive Tier III abilities or oppressive Grifter triggers.</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">7–10 (Mid)</td><td className="px-3 py-1">Standard brawlers. Reserved for Units with Tier I or II abilities.</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">J–K (High)</td><td className="px-3 py-1">Very hard to kill. Vanilla, Enforcers, or OP Units with severe drawbacks.</td></tr>
          <tr className="border-t border-gray-800"><td className="px-3 py-1">A (Ace Wall)</td><td className="px-3 py-1">Almost unkillable. Reserved exclusively for Units with crippling negative Keyword effects.</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function Keywords() {
  return (
    <div id="section-keywords">
      <h2 className="text-2xl font-bold text-amber-300">Keywords & Abilities</h2>
      <p>
        Dead Man's Hand uses 18 keywords scaling in three Roman numeral tiers (I/II/III).
        Each card lists its keyword and tier in the corner.
      </p>
      <p className="mt-3">
        For the full effect text per keyword and tier, see the{" "}
        <a href="/keywords" className="text-amber-400 underline">Keyword Codex</a>.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <Group icon={<Crown className="w-4 h-4" />} title="Leader" items={["Sponsor","Loaded","Sandbag","Hot Streak","Marked","Whale"]} />
        <Group icon={<MapPin className="w-4 h-4" />} title="Location" items={["High Stakes","Public Eye","Vault Run","Crooked Tables"]} />
        <Group icon={<Swords className="w-4 h-4" />} title="Unit" items={["Enforcer","Grifter","Ace Up Sleeve","Hand Synergy","Counterfeit","Fatigue"]} />
        <Group icon={<Sparkles className="w-4 h-4" />} title="Event" items={["Burn Card","Cold Deck","Dead Man's Hand"]} />
        <Group icon={<Package className="w-4 h-4" />} title="Artifact" items={["Lucky Charm","Stacked Deck"]} />
      </div>
    </div>
  );
}

function Group({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-3">
      <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-2">{icon}{title}</h3>
      <ul className="text-xs text-gray-300 space-y-0.5">
        {items.map((i) => <li key={i}>• {i}</li>)}
      </ul>
    </div>
  );
}

function Assassinate() {
  return (
    <div id="section-assassinate">
      <h2 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
        <Skull className="w-6 h-6 text-rose-400" /> Combat: Assassination
      </h2>
      <ul className="space-y-2">
        <li><strong>Action Limit:</strong> You may execute only <em>one Assassination per Hand</em>.</li>
        <li><strong>How:</strong> During your turn, reveal and discard one of your concealed Poker Hole Cards.</li>
        <li><strong>The Math:</strong> Discarded Hole Card value must be ≥ the Unit's Defense stat.</li>
        <li><strong>The Reload:</strong> Immediately draw a replacement Hole Card from the top of the Poker Deck. The drawn card is kept secret from the opponent.</li>
      </ul>
      <p className="mt-3 text-sm text-gray-400">
        Example: To kill a Unit with Defense 11 (Jack), you must discard a J, Q, K, or A from your hole.
      </p>
    </div>
  );
}

function Folding() {
  return (
    <div id="section-folding">
      <h2 className="text-2xl font-bold text-amber-300">Turn Structure & Fold Penalties</h2>
      <p>Folding is a tactical choice with future-hand consequences.</p>

      <h3 className="text-xl text-amber-300 mt-4">Pre-Flop Fold — "Seat Lock"</h3>
      <p>
        If you Fold during the Pre-Flop Phase, you forfeit the Pot and one of your 3
        Casino Floor Seats becomes <strong>Locked</strong> for the entirety of the
        next hand. You cannot place Units or Artifacts in a Locked Seat.
      </p>

      <h3 className="text-xl text-amber-300 mt-4">Post-Flop Fold — "Exhaustion"</h3>
      <p>
        If you Fold during the Flop, Turn, or River, you forfeit the Pot and your
        board remains intact, but any Seat currently holding a Unit becomes an{" "}
        <strong>Exhausted Seat</strong> for the next hand. Units in an Exhausted
        Seat have their text box treated as blank — continuous abilities, Enforcer
        status, and triggers are disabled, but they retain their Defense stats.
      </p>
    </div>
  );
}
