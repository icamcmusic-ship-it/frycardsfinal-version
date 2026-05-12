// Frontend CPU AI for Dead Man's Hand.
// Implements 3 tiers of deterministic and heuristic AI.

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

  // Easy mode filters
  let filtered = [...legal];
  if (difficulty === "easy") {
    filtered = legal.filter(a => a.type !== "assassinate" && a.type !== "ignite" && a.type !== "fold");
  }

  // Expand raise options for smart difficulties
  const hasRaise = filtered.find(a => a.type === "raise");
  if (hasRaise && difficulty !== "easy") {
     const p = state.players[side];
     const oppP = state.players[side === "A" ? "B" : "A"];
     // The base listLegalActions only gives a min raise. Let's provide pot-size and all-in sizes.
     const owed = oppP.currentBet - p.currentBet;
     const potSize = state.pot.main + state.pot.phantom + (owed * 2);

     filtered = filtered.filter(a => a.type !== "raise");

     // Min raise
     const minR = owed + state.bigBlind;
     if (p.stash >= minR && !p.cannotBetOrRaise) filtered.push({ type: "raise", amount: minR });

     // Half-pot raise
     const halfPotR = Math.floor(owed + potSize / 2);
     if (halfPotR > minR && p.stash >= halfPotR && !p.cannotBetOrRaise) filtered.push({ type: "raise", amount: halfPotR });

     // Pot size raise
     const potR = owed + potSize;
     if (potR > halfPotR && p.stash >= potR && !p.cannotBetOrRaise) filtered.push({ type: "raise", amount: potR });

     // All in raise
     const maxRaise = p.stash;
     if (maxRaise > potR && p.stash >= maxRaise && !p.cannotBetOrRaise) filtered.push({ type: "raise", amount: maxRaise });
  }

  if (filtered.length === 0) filtered = [legal[0]]; // fallback

  // Score each action based on board state, pot odds, and hand equity
  const scored = filtered.map(action => ({
    action,
    score: scoreAction(action, state, side, difficulty)
  }));

  // Add stable noise based on RNG state to prevent exact same boring choices, but keep it deterministic
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
  const potSize = s.pot.main + s.pot.phantom + owed;
  const eq = getEquity(s, side);

  const isBluffing = diff === "hard" && ((s.rngState * 13) % 100) < 20; // 20% bluff chance on Hard

  switch (a.type) {
    case "ignite":
      if (diff === "easy") return -100;
      // Ignite when the pot is huge, we have decent equity, or it covers our deficit
      if (eq > 0.6 || potSize > 500) return 90;
      return 10;

    case "assassinate": {
      if (diff === "easy") return -100;
      const targetSeat = opp.seats[a.seat];
      if (!targetSeat.unit) return -100;
      
      let val = 40;
      // High priority targets
      if (targetSeat.unit.keyword === "Enforcer") val += 30; // Unblock to attack/cast!
      if (targetSeat.unit.keyword === "Grifter") val += 20; // Stop chip bleed
      if (targetSeat.unit.keywordTier && targetSeat.unit.keywordTier >= 2) val += 15;
      if (targetSeat.unit.baseDefense >= 10) val += 10;
      return val;
    }

    case "cast": {
      const def = s.cardDefs[a.cardId];
      if (!def) return -10;

      let cost = def.cast_cost ?? 0;
      
      if (def.card_type === "Unit") {
        let val = 50;
        if (diff === "easy") return 80;

        if (def.keyword === "Syndicate") {
            const counts = p.seats.filter(se => se.unit?.keyword === "Syndicate").length;
            val += 15 * counts;
        }
        if (def.keyword === "Vanguard") val += 25; // Useful proactively
        
        // Seat placement evaluation for Units
        if (a.seat !== undefined && a.seat >= 0 && a.seat < 3) {
            const oppSeat = opp.seats[a.seat];
            if (def.keyword === "Enforcer") {
                val += 30; // Great defense
            } else {
                // If it's a weak unit, maybe don't place it in front of a massive enemy Enforcer
                if (oppSeat.unit && (oppSeat.unit.baseDefense ?? 0) > (def.defense ?? 0) + 5) {
                    val -= 15; // Harder to kill them than they kill us
                }
            }
        }
        
        // Lower priority if it's super expensive relative to our stack unless it's a game-changer
        if (cost > p.stash * 0.4) val -= 15;

        return val;
      }

      if (def.card_type === "Event") {
        if (diff === "easy") return 15;
        let val = 40;
        // E.g. save board clears for when opponent has a full board
        if (def.effect_text?.toLowerCase().includes("destroy")) {
          const enemyUnits = opp.seats.filter(se => se.unit).length;
          if (enemyUnits >= 2) val += 40;
          else val -= 20; // Don't waste it on empty board
        }
        if (def.effect_text?.toLowerCase().includes("heal") || def.effect_text?.toLowerCase().includes("gain")) {
           if (p.stash < 200) val += 30; // need money
        }
        return val;
      }

      if (def.card_type === "Artifact") {
        // Find if target seat has a strong unit
        const seatState = p.seats[a.seat ?? 0];
        if (seatState.unit) return 35; // Buffing our unit
        return 5;
      }

      return 15;
    }

    case "fuel":
      if (diff === "easy") return -10;
      return (p.leaderFuel < 3 && p.stash > 150) ? 35 : -10;

    case "place_location":
      return 200; // Always drop a location for advantages

    case "check":
    case "pass":
      // Pass is the default when standing pat. Check is always preferred over nothing.
      return 25;

    case "call": {
      if (diff === "easy") return 30; // Easy loves to call
      
      const potOdds = owed / (potSize + owed); // e.g. 50 to win 200 = 0.2
      // If equity > pot odds, it's a profitable call.
      
      if (owed === 0) return 25; // Should be a check instead, but just in case
      
      if (eq > potOdds * 1.2) return 40; // Good call
      if (eq > potOdds) return 30; // Marginal call

      if (isBluffing && owed <= s.bigBlind) return 35; // Floating a small bet as a bluff setup
      
      if (owed < p.stash * 0.05) return 20; // Super cheap call
      return -10; // Bad call
    }

    case "raise": {
      if (diff === "easy") return 5;
      
      let raiseScore = 0;
      const rAmount = a.amount || s.bigBlind;
      const isMinR = rAmount <= s.bigBlind * 2;
      const isPotR = rAmount >= potSize * 0.8;
      
      if (eq > 0.85) {
        // Monster hand: Value bet big
        raiseScore = isPotR ? 60 : (isMinR ? 30 : 50);
      } else if (eq > 0.6) {
        // Strong hand
        raiseScore = isPotR ? 35 : 45; // Prefer smaller to keep them in, or half pot
      } else if (isBluffing) {
        // Bluff! Pot raise to force folds
        raiseScore = isPotR ? 55 : 20;
      } else {
        // Weak hand, no bluff
        raiseScore = -20;
      }
      
      return raiseScore;
    }

    case "desperado_fold":
      return owed > 0 && eq < 0.3 ? 95 : -10;

    case "prophet_peek":
      return 150; // Always peek if possible

    case "ultimatum":
      return 190; // Use immediately

    case "nomad_move":
      return diff === "easy" ? -10 : 30; // Mild preference to move if they have cash

    case "parry":
      return 150; // Always parry if possible (reactive)
    case "parryPass":
      return 10;

    case "fold": {
      if (diff === "easy") return -100;
      if (owed === 0) return -100; // Never fold when we can check
      
      const potOdds = owed / (potSize + owed);
      if (eq < potOdds * 0.8 && !isBluffing) {
         return 80; // Definitely fold trash facing a big bet
      }
      
      return -50;
    }

    default:
      return 0;
  }
}

function getEquity(s: MatchState, side: PlayerSide): number {
  const p = s.players[side];
  if (p.holeCards.length === 0) return 0.5;

  if (s.community.length >= 3) {
    const ctx = buildEvalContext(s, side);
    const ev = evaluateBest(p.holeCards, s.community, ctx);
    
    // Normalized strength 0-1 mapped loosely from standard hand probabilities
    const rankMap: Record<string, number> = {
        "royal-flush": 1.0,
        "straight-flush": 0.98,
        "four-of-a-kind": 0.92,
        "full-house": 0.85,
        "flush": 0.78,
        "straight": 0.70,
        "three-of-a-kind": 0.60,
        "two-pair": 0.45,
        "pair": 0.30,
        "high-card": 0.10
    };
    
    // Slight boost for High kickers inside the same rank
    let base = rankMap[ev.rank] || 0.1;
    if (ev.tiebreak && ev.tiebreak.length > 0) {
      base += (ev.tiebreak[0] / 15) * 0.05; // 0 to 0.05 modifier
    }
    return Math.min(1.0, base);
  }

  // Pre-flop logic (Chen Formula variant)
  const [c1, c2] = p.holeCards;
  if (!c1 || !c2) return 0.5;
  
  let score = 0;
  const maxCard = Math.max(c1.rank, c2.rank);
  
  score += maxCard * 2; // High card points
  if (c1.rank === c2.rank) {
     score *= 2.0; // Pairs are great
     if (c1.rank >= 10) score += 20; // High pairs
  } else {
     const gap = Math.abs(c1.rank - c2.rank);
     if (gap === 1) score -= 1; // connected
     else if (gap === 2) score -= 2;
     else if (gap === 3) score -= 4;
     else score -= 5;
  }
  
  if (c1.suit === c2.suit) score += 4; // Suited

  // Normalize: A,A ~ 52 => ~0.85 equity
  // 7,2 off => ~10 => ~0.15 equity
  const normalized = score / 60;
  return Math.max(0.1, Math.min(0.85, normalized));
}
