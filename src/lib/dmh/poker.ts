// Hand evaluation with support for: wildcards, suit-shift, restriction levels,
// undercover-tier3 hand-rank upgrade, and the "Dealer II face=10" rule.

import type { PokerCard, Rank, Suit, HandRank, Keyword, Tier, MatchState } from './types';
import { HAND_RANK_ORDER } from './types';

export interface EvalContext {
  /** Treat Spades+Clubs as same suit */
  suitShiftBlackUnified?: boolean;
  /** Treat Hearts+Diamonds as same suit */
  suitShiftRedUnified?: boolean;
  /** Disable Flushes (Restriction I+) */
  noFlush?: boolean;
  /** Disable Straights (Restriction II) */
  noStraight?: boolean;
  /** Cap hand at three-of-a-kind (Restriction II) */
  cap3OfAKind?: boolean;
  /** All 2s wild (Wildcard I) */
  allTwosWild?: boolean;
  /** All Spade face cards wild (Wildcard II) */
  spadeFaceWild?: boolean;
  /** Dealer II — face cards count as 10 for ranking */
  faceCardsAreTen?: boolean;
  /** A subset of community cards visible to player; used for showdown when Blind-River hides Turn/River */
  hideCommunityIndices?: number[];
}

function effectiveSuit(c: PokerCard, ctx: EvalContext): Suit {
  if (ctx.suitShiftBlackUnified && (c.suit === 'S' || c.suit === 'C')) return 'S';
  if (ctx.suitShiftRedUnified && (c.suit === 'H' || c.suit === 'D')) return 'H';
  return c.suit;
}

function isWild(c: PokerCard, ctx: EvalContext): boolean {
  if (c.wild) return true;
  if (ctx.allTwosWild && c.rank === 2) return true;
  if (ctx.spadeFaceWild && c.suit === 'S' && (c.rank === 11 || c.rank === 12 || c.rank === 13)) return true;
  return false;
}

function effectiveRank(c: PokerCard, ctx: EvalContext): Rank {
  if (ctx.faceCardsAreTen && (c.rank === 11 || c.rank === 12 || c.rank === 13)) return 10 as Rank;
  return c.rank;
}

/** Generate all 5-card subsets of an array. */
function* combos5<T>(arr: T[]): Generator<T[]> {
  const n = arr.length;
  if (n < 5) return;
  for (let a = 0; a < n - 4; a++)
   for (let b = a + 1; b < n - 3; b++)
    for (let c = b + 1; c < n - 2; c++)
     for (let d = c + 1; d < n - 1; d++)
      for (let e = d + 1; e < n; e++) yield [arr[a], arr[b], arr[c], arr[d], arr[e]];
}

interface Eval5 {
  rank: HandRank;
  /** kickers, descending */
  tiebreak: number[];
}

const HR_INDEX: Record<HandRank, number> = HAND_RANK_ORDER.reduce(
  (a, k, i) => { a[k] = i; return a; },
  {} as Record<HandRank, number>
);

function evaluate5(cards: PokerCard[], ctx: EvalContext): Eval5 {
  if (cards.length !== 5) throw new Error('evaluate5 expects 5 cards');
  const wilds = cards.filter(c => isWild(c, ctx));
  const nonWilds = cards.filter(c => !isWild(c, ctx));
  // Try every assignment of wilds to (rank, suit) — but in practice we just brute-force
  // possible best hands by treating wilds as flexible joker-like cards.
  // Since at most 5 cards are wild, we try the highest ranks 14,13,…,2 and all suits.

  // Helper that evaluates a *concrete* 5-card hand (no wilds).
  function evalConcrete(hand: PokerCard[]): Eval5 {
    const ranks = hand.map(h => effectiveRank(h, ctx)).sort((a, b) => b - a);
    const suits = hand.map(h => effectiveSuit(h, ctx));
    const counts = new Map<Rank, number>();
    ranks.forEach(r => counts.set(r, (counts.get(r) ?? 0) + 1));
    const sortedCounts = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const isFlush = !ctx.noFlush && suits.every(s => s === suits[0]);
    let isStraight = false;
    let straightHigh = 0;
    if (!ctx.noStraight) {
      // Standard
      const distinct = [...new Set(ranks)].sort((a, b) => b - a);
      if (distinct.length === 5 && (distinct[0] - distinct[4]) === 4) {
        isStraight = true; straightHigh = distinct[0];
      }
      // Wheel A-2-3-4-5
      if (!isStraight) {
        const set = new Set(ranks);
        if (set.has(14 as Rank) && set.has(2 as Rank) && set.has(3 as Rank) && set.has(4 as Rank) && set.has(5 as Rank)) {
          isStraight = true; straightHigh = 5;
        }
      }
    }
    let rank: HandRank = 'high-card';
    let tiebreak: number[] = ranks;
    if (isStraight && isFlush && straightHigh === 14) { rank = 'royal-flush'; tiebreak = [14]; }
    else if (isStraight && isFlush) { rank = 'straight-flush'; tiebreak = [straightHigh]; }
    else if (sortedCounts[0]?.[1] === 4) { rank = 'four-kind'; tiebreak = [sortedCounts[0][0], sortedCounts[1]?.[0] ?? 0]; }
    else if (sortedCounts[0]?.[1] === 3 && sortedCounts[1]?.[1] === 2) { rank = 'full-house'; tiebreak = [sortedCounts[0][0], sortedCounts[1][0]]; }
    else if (isFlush) { rank = 'flush'; tiebreak = ranks; }
    else if (isStraight) { rank = 'straight'; tiebreak = [straightHigh]; }
    else if (sortedCounts[0]?.[1] === 3) { rank = 'three-kind'; tiebreak = [sortedCounts[0][0], ...ranks.filter(r => r !== sortedCounts[0][0])]; }
    else if (sortedCounts[0]?.[1] === 2 && sortedCounts[1]?.[1] === 2) {
      const high = Math.max(sortedCounts[0][0], sortedCounts[1][0]);
      const low  = Math.min(sortedCounts[0][0], sortedCounts[1][0]);
      rank = 'two-pair'; tiebreak = [high, low, ranks.find(r => r !== high && r !== low) ?? 0];
    }
    else if (sortedCounts[0]?.[1] === 2) {
      rank = 'pair'; tiebreak = [sortedCounts[0][0], ...ranks.filter(r => r !== sortedCounts[0][0])];
    }
    if (ctx.cap3OfAKind && (rank === 'straight' || rank === 'flush' || rank === 'full-house' || rank === 'four-kind' || rank === 'straight-flush' || rank === 'royal-flush')) {
      // Restriction II caps at three-of-a-kind. Re-evaluate without straight/flush flags.
      if (sortedCounts[0]?.[1] === 4) { rank = 'three-kind'; tiebreak = [sortedCounts[0][0], ...ranks.filter(r => r !== sortedCounts[0][0])].slice(0, 3); }
      else if (sortedCounts[0]?.[1] === 3) { rank = 'three-kind'; tiebreak = [sortedCounts[0][0], ...ranks.filter(r => r !== sortedCounts[0][0])].slice(0, 3); }
      else if (sortedCounts[0]?.[1] === 2 && sortedCounts[1]?.[1] === 2) {
        const high = Math.max(sortedCounts[0][0], sortedCounts[1][0]);
        const low  = Math.min(sortedCounts[0][0], sortedCounts[1][0]);
        rank = 'two-pair'; tiebreak = [high, low, ranks.find(r => r !== high && r !== low) ?? 0];
      }
      else if (sortedCounts[0]?.[1] === 2) {
        rank = 'pair'; tiebreak = [sortedCounts[0][0], ...ranks.filter(r => r !== sortedCounts[0][0])];
      } else { rank = 'high-card'; tiebreak = ranks; }
    }
    return { rank, tiebreak };
  }

  if (wilds.length === 0) return evalConcrete(cards);

  // For each wild, try all possible (rank, suit) combos. To keep it tractable,
  // only try ranks 14..2 and suits S H D C — 13 * 4 = 52 per wild.
  // For up to 5 wilds, the search space is large but rare in practice (cap wilds at 3 here for perf).
  const wildCount = Math.min(wilds.length, 3);
  let best: Eval5 = { rank: 'high-card', tiebreak: [0] };
  const ranksAll: Rank[] = [14,13,12,11,10,9,8,7,6,5,4,3,2];
  const suitsAll: Suit[] = ['S','H','D','C'];
  function trySubst(i: number, current: PokerCard[]) {
    if (i === wildCount) {
      const evald = evalConcrete([...current, ...nonWilds]);
      if (HR_INDEX[evald.rank] > HR_INDEX[best.rank] ||
         (HR_INDEX[evald.rank] === HR_INDEX[best.rank] && compareTiebreak(evald.tiebreak, best.tiebreak) > 0)) {
        best = evald;
      }
      return;
    }
    for (const r of ranksAll) for (const s of suitsAll) {
      trySubst(i + 1, [...current, { rank: r, suit: s, faceUp: true }]);
    }
  }
  trySubst(0, []);
  return best;
}

function compareTiebreak(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0, bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/** Best 5-of-7 evaluation — standard Texas Hold'em. */
export function evaluateBest(holes: PokerCard[], community: PokerCard[], ctx: EvalContext): Eval5 {
  const visibleCommunity = community.filter((_, i) => !ctx.hideCommunityIndices?.includes(i));
  const all = [...holes, ...visibleCommunity];
  if (all.length < 5) {
    // Not enough to evaluate; treat as raw high card.
    const ranks = all.map(c => effectiveRank(c, ctx)).sort((a, b) => b - a);
    return { rank: 'high-card', tiebreak: ranks };
  }
  let best: Eval5 = { rank: 'high-card', tiebreak: [0] };
  for (const five of combos5(all)) {
    const ev = evaluate5(five, ctx);
    if (HR_INDEX[ev.rank] > HR_INDEX[best.rank] ||
       (HR_INDEX[ev.rank] === HR_INDEX[best.rank] && compareTiebreak(ev.tiebreak, best.tiebreak) > 0)) {
      best = ev;
    }
  }
  return best;
}

export function compareEval(a: Eval5, b: Eval5): number {
  if (HR_INDEX[a.rank] !== HR_INDEX[b.rank]) return HR_INDEX[a.rank] - HR_INDEX[b.rank];
  return compareTiebreak(a.tiebreak, b.tiebreak);
}

/** Build an EvalContext from MatchState by reading the active Location and unit keywords. */
export function buildEvalContext(s: MatchState, side: 'A'|'B'): EvalContext {
  const ctx: EvalContext = {};
  const loc = s.location;
  if (loc) {
    if (loc.keyword === 'Suit-Shift' && loc.tier === 1) ctx.suitShiftBlackUnified = true;
    if (loc.keyword === 'Suit-Shift' && loc.tier === 2) ctx.suitShiftRedUnified = true;
    if (loc.keyword === 'Restriction' && loc.tier >= 1) ctx.noFlush = true;
    if (loc.keyword === 'Restriction' && loc.tier >= 2) { ctx.noStraight = true; ctx.cap3OfAKind = true; }
    if (loc.keyword === 'Wildcard' && loc.tier === 1) ctx.allTwosWild = true;
    if (loc.keyword === 'Wildcard' && loc.tier === 2) ctx.spadeFaceWild = true;
    if (loc.keyword === 'Blind-River' && s.phase !== 'showdown') {
      const hide: number[] = [];
      if (loc.tier >= 1 && s.community.length >= 4) hide.push(3); // Turn = index 3
      if (loc.tier >= 2 && s.community.length >= 5) hide.push(4); // River = index 4
      ctx.hideCommunityIndices = hide;
    }
  }
  // Dealer II: any of OUR units has Dealer Tier 2?
  const me = s.players[side];
  const hasDealer2 = me.seats.some(seat => seat.unit?.keyword === 'Dealer' && seat.unit.keywordTier === 2 && !seat.unit.silenced);
  if (hasDealer2) ctx.faceCardsAreTen = true;
  return ctx;
}
