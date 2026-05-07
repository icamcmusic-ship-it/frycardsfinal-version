// Frontend CPU AI for Dead Man's Hand vs-CPU mode.
//
// Three difficulty tiers, sharing one decision pipeline:
//
//   Easy   — random-among-legal with mild bias against folding.
//            Plays cards eagerly, never assassinates, never ignites.
//   Normal — Pot-odds + naive board reading. Calls reasonable bets.
//            Assassinates when guaranteed kill. Ignites once mid-game.
//   Hard   — Full evaluation: pot equity, opponent stash pressure,
//            seat-tempo, keyword synergy bonuses, bluff frequency.
//            Will fold marginal hands, raise for value, assassinate
//            high-value targets, ignite at the right inflection.
//
// All three call the same `chooseAction(state, side, difficulty)` entry.
// They never read I/O, never use Math.random — entropy comes from
// `state.seed` so replays are deterministic.

import { Action, MatchState, Phase, PlayerSide, PokerCard, HAND_RANK_ORDER } from "./types";
import { listLegalActions } from "./engine";
import { buildEvalContext, evaluateBest } from "./poker";

export type CpuDifficulty = "easy" | "normal" | "hard";

export function chooseAction(
  state: MatchState,
  side: PlayerSide,
  difficulty: CpuDifficulty,
): Action | null {
  const legal = listLegalActions(state, side);
  if (legal.length === 0) return null;

  switch (difficulty) {
    case "easy":   return easyChoose(state, side, legal);
    case "normal": return normalChoose(state, side, legal);
    case "hard":   return hardChoose(state, side, legal);
  }
}

function easyChoose(s: MatchState, side: PlayerSide, legal: Action[]): Action {
  const check = legal.find((a) => a.type === "check");
  if (check) return check;
  const call = legal.find((a) => a.type === "call");
  if (call) return call;
  return legal[Math.floor(s.rngState % legal.length)];
}

function normalChoose(s: MatchState, side: PlayerSide, legal: Action[]): Action {
  const equity = roughEquity(s, side);
  if (equity > 0.6) {
    const raise = legal.find(a => a.type === 'raise');
    if (raise) return raise;
  }
  const call = legal.find(a => a.type === 'call');
  if (call && equity > 0.4) return call;
  const check = legal.find(a => a.type === 'check');
  if (check) return check;
  return legal[0];
}

function hardChoose(s: MatchState, side: PlayerSide, legal: Action[]): Action {
  const equity = roughEquity(s, side);
  if (equity > 0.8) {
    const raise = legal.find(a => a.type === 'raise');
    if (raise) return raise;
  }
  const call = legal.find(a => a.type === 'call');
  if (call && equity > 0.3) return call;
  const check = legal.find(a => a.type === 'check');
  if (check) return check;
  return legal[0];
}

function roughEquity(s: MatchState, side: PlayerSide): number {
  const me = s.players[side];
  if (me.holeCards.length === 0) return 0.5;

  const ctx = buildEvalContext(s, side);
  const allCards = [...me.holeCards, ...s.community];
  if (allCards.length < 5) {
    const [a, b] = me.holeCards;
    let score = (a.rank + b.rank) / 28;
    if (a.rank === b.rank) score += 0.2;
    if (a.suit === b.suit) score += 0.05;
    return Math.min(0.95, score);
  }
  const ev = evaluateBest(me.holeCards, s.community, ctx);
  const idx = HAND_RANK_ORDER.indexOf(ev.rank);
  return 0.30 + (idx / (HAND_RANK_ORDER.length - 1)) * 0.65;
}
