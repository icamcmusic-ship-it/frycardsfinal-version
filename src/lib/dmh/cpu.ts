// Frontend CPU AI for Dead Man's Hand.
// Implements 3 tiers of deterministic AI.

import { Action, MatchState, PlayerSide, CardDef, Keyword } from "./types";
import { listLegalActions } from "./engine";
import { buildEvalContext, evaluateBest, compareEval } from "./poker";

export type CpuDifficulty = "easy" | "normal" | "hard";

export function chooseAction(
  state: MatchState,
  side: PlayerSide,
  difficulty: CpuDifficulty,
): Action | null {
  const legal = listLegalActions(state, side);
  if (legal.length === 0) return null;

  // Filter based on difficulty restrictions
  let filtered = [...legal];
  if (difficulty === "easy") {
    filtered = legal.filter(a => a.type !== "assassinate" && a.type !== "ignite" && a.type !== "fold");
  }

  if (filtered.length === 0) filtered = [legal[0]]; // fallback

  // Score each action
  const scored = filtered.map(action => ({
    action,
    score: scoreAction(action, state, side, difficulty)
  }));

  // Add a tiny bit of stable noise based on RNG state for tie-breaking
  scored.forEach((it, i) => {
    it.score += ((state.rngState + i) % 100) / 1000;
  });

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  return scored[0].action;
}

function scoreAction(a: Action, s: MatchState, side: PlayerSide, diff: CpuDifficulty): number {
  const p = s.players[side];
  const oppSide = side === "A" ? "B" : "A";
  const opp = s.players[oppSide];
  const owed = opp.currentBet - p.currentBet;

  switch (a.type) {
    case "ignite":
      if (diff === "easy") return -999;
      return 100; // Prioritize Ignite

    case "assassinate": {
      if (diff === "easy") return -999;
      const targetSeat = opp.seats[a.seat];
      if (!targetSeat.unit) return -999;
      
      let base = (diff === "hard") ? 60 : 40;
      // Hard: Target Enforcer first
      if (diff === "hard" && targetSeat.unit.keyword === "Enforcer") base += 20;
      // Bonus for high tier
      if (targetSeat.unit.keywordTier && targetSeat.unit.keywordTier >= 2) base += 10;
      return base;
    }

    case "cast": {
      const def = s.cardDefs[a.cardId];
      if (!def) return 0;

      if (def.card_type === "Unit") {
        let val = 40;
        if (diff === "easy") val = 80; // Easy eagerly casts units

        // Value units
        if (def.keyword === "Grifter" || def.keyword === "Enforcer") val += 15;
        if (def.keyword === "Syndicate") {
            const counts = p.seats.filter(se => se.unit?.keyword === "Syndicate").length;
            if (counts > 0) val += 20;
        }
        return val;
      }

      if (def.card_type === "Event") {
        if (diff === "easy") return 10;
        if (diff === "normal") return 25;
        return 45; // Hard prioritizes events over poker play if they are good
      }

      if (def.card_type === "Artifact") {
        return (diff === "easy") ? 5 : 20;
      }

      return 10;
    }

    case "fuel":
      if (diff === "easy") return -10;
      return (p.leaderFuel < 3) ? 35 : -10;

    case "check":
    case "pass":
      return 15;

    case "call": {
      const eq = getEquity(s, side);
      if (eq > 0.6) return 30;
      if (eq > 0.4) return 20;
      if (owed < s.bigBlind) return 15; // Small call
      return 5;
    }

    case "raise": {
      if (diff === "easy") return 5;
      const eq = getEquity(s, side);
      if (eq > 0.75) return 50; // Strong value raise
      if (diff === "hard" && eq > 0.6) return 35;
      return 0;
    }

    case "fold": {
      if (diff === "easy") return -1000;
      if (owed === 0) return -1000; // Never fold to a check
      const eq = getEquity(s, side);
      if (eq < 0.2) return 25; // Fold garbage
      return 0;
    }

    default:
      return 0;
  }
}

function getEquity(s: MatchState, side: PlayerSide): number {
  const p = s.players[side];
  if (p.holeCards.length === 0) return 0.5;

  // Real evaluation if beyond flop
  if (s.community.length >= 3) {
    const ctx = buildEvalContext(s, side);
    const ev = evaluateBest(p.holeCards, s.community, ctx);
    // Rough normalization 0-1
    const rankMap: Record<string, number> = {
        "royal-flush": 1.0,
        "straight-flush": 0.95,
        "four-of-a-kind": 0.9,
        "full-house": 0.85,
        "flush": 0.8,
        "straight": 0.75,
        "three-of-a-kind": 0.65,
        "two-pair": 0.5,
        "pair": 0.35,
        "high-card": 0.15
    };
    return rankMap[ev.rank] || 0.1;
  }

  // Pre-flop naive equity
  const [c1, c2] = p.holeCards;
  if (!c1 || !c2) return 0.5;
  let score = (c1.rank + c2.rank) / 28;
  if (c1.rank === c2.rank) score += 0.2;
  if (c1.suit === c2.suit) score += 0.05;
  return Math.min(0.9, score);
}
