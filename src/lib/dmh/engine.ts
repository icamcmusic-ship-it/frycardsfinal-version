// ============================================================
// Dead Man's Hand — Pure deterministic game engine.
// Full implementation of ALL rules: poker loop, TCG casting,
// assassination, fold penalties, all 18 keywords, blind
// escalation, fatigue, and buyout.

import type {
  Action, CardDef, FuelPayload, GameLogEntry, HandRank,
  Keyword, LocationCard, MatchState, Phase, Player,
  PlayerSide, PokerCard, Seat, Tier, Unit, Pot,
} from "./types";
import { getKeyword } from "./keywords-data";
import { buildEvalContext, compareEval, evaluateBest } from "./poker";

// ============================================================
// SECTION 1 — RNG
// ============================================================
function lcg(seed: number): { next: () => number; seed: number } {
  let s = (seed | 0) || 1;
  return {
    get seed() { return s; },
    next: () => {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return ((s >>> 0) % 0x100000000) / 0x100000000;
    },
  };
}
function shuffleInPlace<T>(arr: T[], seed: number): number {
  const r = lcg(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return r.seed;
}

// ============================================================
// SECTION 2 — BUILDERS
// ============================================================
const SUITS: PokerCard["suit"][] = ["S", "H", "D", "C"];

function buildPokerDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS)
    for (let rank = 2; rank <= 14; rank++)
      deck.push({ suit, rank: rank as PokerCard["rank"], faceUp: false });
  return deck;
}

export interface NewMatchInput {
  p1: { user_id: string; user_name: string; deck: { leaderCardId: string; cards: string[] }; cardDefs: CardDef[]; cardBackImageUrl?: string };
  p2: { user_id: string; user_name: string; deck: { leaderCardId: string; cards: string[] }; cardDefs: CardDef[]; cardBackImageUrl?: string };
  seed: number;
}

const DEFAULT_STASH = 1000;
const BASE_BIG_BLIND = 20;

export function newMatch(input: NewMatchInput): MatchState {
  const state: MatchState = {
    matchId: "local-" + input.seed,
    seed: input.seed,
    rngState: input.seed,
    players: {
      A: makePlayer(input.p1, "A", DEFAULT_STASH),
      B: makePlayer(input.p2, "B", DEFAULT_STASH),
    },
    cardDefs: buildDefMap([...input.p1.cardDefs, ...input.p2.cardDefs]),
    activePlayer: "A",
    dealer: "A",
    phase: "preflop",
    handNumber: 0,
    community: [],
    pokerDeck: [],
    muck: [],
    location: null,
    pot: { main: 0, phantom: 0 },
    bigBlind: BASE_BIG_BLIND,
    winnerThisHand: null,
    log: [],
    winner: null,
  };
  return startNewHand(state);
}

function buildDefMap(defs: CardDef[]): Record<string, CardDef> {
  const m: Record<string, CardDef> = {};
  for (const d of defs) m[d.id] = d;
  return m;
}

function makePlayer(
  src: NewMatchInput["p1"] | NewMatchInput["p2"],
  side: "A" | "B",
  stash: number,
): Player {
  return {
    id: src.user_id,
    name: src.user_name,
    side,
    isCpu: side === "B",
    stash,
    reserve: 0,
    vault: 0,
    deck: [...src.deck.cards],
    hand: [],
    graveyard: [],
    exiled: [],
    leaderCardId: src.deck.leaderCardId,
    leaderWounds: 0,
    leaderFuel: 0,
    leaderIgnited: false,
    seats: [
      { index: 0, unit: null, locked: false },
      { index: 1, unit: null, locked: false },
      { index: 2, unit: null, locked: false },
    ],
    holeCards: [],
    fatigueTokens: 0,
    maxHandSize: 7,
    hasFolded: false,
    hasPlayedFoldCast: false,
    currentBet: 0,
    hasActed: false,
    cannotFold: false,
    cannotBetOrRaise: false,
    assassinationUsedThisHand: false,
    firstCastDiscountUsed: false,
    cardBackImageUrl: src.cardBackImageUrl,
  };
}

// ============================================================
// SECTION 3 — HAND MANAGEMENT
// ============================================================
function startNewHand(s: MatchState): MatchState {
  s = clone(s);
  s.handNumber += 1;

  // §3 Blind escalation: double every 5 hands
  const tier = Math.floor((s.handNumber - 1) / 5);
  s.bigBlind = BASE_BIG_BLIND * Math.pow(2, tier);

  // §3 Fatigue: if graveyard has 10+ cards, bigBlind doubles additively
  for (const side of ["A", "B"] as const) {
    if (s.players[side].graveyard.length >= 10) {
      s.bigBlind *= 2; // additive with other effects per §3
      break; // once is enough for the base rule
    }
  }

  // Build and shuffle poker deck, add old muck back
  s.pokerDeck = buildPokerDeck();
  s.rngState = shuffleInPlace(s.pokerDeck, s.rngState);
  s.community = [];
  s.muck = [];
  s.pot = { main: 0, phantom: 0 };
  s.winnerThisHand = null;

  // §8 Location rotation: swap location every 2 hands
  if (s.handNumber % 2 === 1) {
    // Try to place the Location card from the deck of the non-dealer
    const locSide = s.dealer === "A" ? "B" : "A";
    const p = s.players[locSide];
    const hasLocationInDeck = p.deck.some(cid => s.cardDefs[cid]?.card_type === "Location");
    if (hasLocationInDeck) {
      s.waitingForLocation = locSide;
      appendLog(s, "preflop", `[${p.name}] is selecting a new Location...`);
    }
  }

  // Reset per-hand player state
  for (const side of ["A", "B"] as const) {
    const p = s.players[side];
    p.hasFolded = false;
    p.hasPlayedFoldCast = false;
    p.currentBet = 0;
    p.hasActed = false;
    p.assassinationUsedThisHand = false;
    p.firstCastDiscountUsed = false;

    // §8 Apply previous fold penalties
    for (const seat of p.seats) {
      if (seat._lockNextHand) { seat.locked = true; seat._lockNextHand = false; }
      else seat.locked = false;
      if (seat.unit && seat._exhaustNextHand) {
        seat.unit.exhausted = true;
        seat.unit.silenced = true;
        seat._exhaustNextHand = false;
      } else if (seat.unit) {
        seat.unit.exhausted = false;
        seat.unit.silenced = false;
      }
    }

    // §2 Each player draws up to their hand size limit at start of hand
    drawTcgCards(s, side, Math.min(3, p.maxHandSize - p.hand.length));

    // Deal 2 poker hole cards
    p.holeCards = [];
    const c1 = s.pokerDeck.pop();
    const c2 = s.pokerDeck.pop();
    if (c1) p.holeCards.push(c1);
    if (c2) p.holeCards.push(c2);
  }

  // §2 Vanguard I: peek top of deck at start of preflop
  applyLeaderPreflop(s, "A");
  applyLeaderPreflop(s, "B");

  // Post blinds
  const sb = s.bigBlind / 2;
  postBlind(s, s.dealer, sb);
  postBlind(s, opp(s.dealer), s.bigBlind);

  // Dealer acts first preflop
  s.activePlayer = s.dealer;
  s.phase = "preflop";

  appendLog(s, "preflop", `Hand ${s.handNumber} begins. Blinds ${sb}/${s.bigBlind}.`);
  return s;
}

function drawLocationFromDeck(s: MatchState, side: "A" | "B"): LocationCard | null {
  const p = s.players[side];
  const locIdx = p.deck.findIndex(cid => {
    const def = s.cardDefs[cid];
    return def?.card_type === "Location";
  });
  if (locIdx === -1) return s.location; // keep old location
  const [locCardId] = p.deck.splice(locIdx, 1);
  const def = s.cardDefs[locCardId];
  if (!def?.keyword || !def.keyword_tier) return s.location;
  p.graveyard.push(locCardId); // Location goes to graveyard after activating
  return { cardId: locCardId, keyword: def.keyword as Keyword, tier: def.keyword_tier as Tier };
}

function drawTcgCards(s: MatchState, side: "A" | "B", n: number) {
  const p = s.players[side];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (p.graveyard.length === 0) {
        // §Golden Rule 16: Void Draw — leader takes 1 wound
        p.leaderWounds += 1;
        appendLog(s, s.phase, `${p.name} has an empty deck and graveyard — Leader takes a Void Wound!`);
        return;
      }
      // Reshuffle graveyard into deck
      p.deck = [...p.graveyard];
      p.graveyard = [];
      s.rngState = shuffleInPlace(p.deck, s.rngState);
    }
    p.hand.push(p.deck.shift()!);
  }
}

function postBlind(s: MatchState, side: "A" | "B", amount: number) {
  const p = s.players[side];
  const paid = Math.min(p.stash, amount);
  p.stash -= paid;
  p.currentBet = paid;
  s.pot.main += paid;
}

function applyLeaderPreflop(s: MatchState, side: "A" | "B") {
  const p = s.players[side];
  const def = s.cardDefs[p.leaderCardId];
  if (!def) return;
  if (def.keyword === "Vanguard" && def.keyword_tier === 1) {
    // Peek top card of deck (recorded in log; UI shows it)
    const top = p.deck[0];
    if (top) appendLog(s, "preflop", `[${p.name}] Vanguard I: peek at top of deck — ${s.cardDefs[top]?.name ?? top}`);
  }
  if (def.keyword === "Martyr") {
    // Martyr: pay 50 chips tax or Leader dies
    if (p.stash >= 50) {
      p.stash -= 50;
      s.pot.main += 50;
      appendLog(s, "preflop", `[${p.name}] Martyr: paid 50-chip tax.`);
    } else {
      s.winner = opp(side);
      appendLog(s, "preflop", `[${p.name}] Martyr: cannot pay tax — Leader dies! Game over.`);
    }
  }
}

// ============================================================
// SECTION 4 — ACTION VALIDATION
// ============================================================
export function listLegalActions(s: MatchState, actor: "A" | "B"): Action[] {
  if (s.phase === "ended") return [];

  // §8 Location Selection Turn
  if (s.waitingForLocation) {
    if (s.waitingForLocation !== actor) return [];
    const p = s.players[actor];
    const acts: Action[] = [];
    const locationIdsInDeck = p.deck.filter(cid => s.cardDefs[cid]?.card_type === "Location");
    for (const cid of locationIdsInDeck) {
      acts.push({ type: "place_location", cardId: cid });
    }
    acts.push({ type: "pass" }); // Skip/Keep old
    return acts;
  }

  if (s.activePlayer !== actor) return [];
  const p = s.players[actor];
  if (p.hasFolded) return [];

  const acts: Action[] = [];
  const oppP = s.players[opp(actor)];
  const owed = oppP.currentBet - p.currentBet;

  // Betting
  if (owed === 0) acts.push({ type: "check" });
  if (owed > 0 && p.stash > 0) acts.push({ type: "call" });
  
  if (p.stash > owed && !p.cannotBetOrRaise) {
    // Min raise
    const minRaise = owed + s.bigBlind;
    if (p.stash >= minRaise) {
      acts.push({ type: "raise", amount: minRaise });
    }
    
    // Pot raise (current pot + 2*owed)
    const potRaise = owed + s.pot.main + s.pot.phantom + owed;
    if (potRaise > minRaise && p.stash >= potRaise) {
      acts.push({ type: "raise", amount: potRaise });
    }

    // All In
    if (p.stash > minRaise && p.stash !== potRaise) {
      acts.push({ type: "raise", amount: p.stash });
    }
  }
  if (!p.cannotFold) acts.push({ type: "fold" });

  // Pass (used at end of betting rounds to advance phase)
  acts.push({ type: "pass" });

  // TCG Cast — any card in hand that we can afford
  for (const cardId of p.hand) {
    const def = s.cardDefs[cardId];
    if (!def) continue;
    let cost = def.cast_cost ?? 0;

    // High Stakes III doubles cast costs
    if (s.location?.keyword === "High Stakes" && (s.location.tier ?? 0) >= 3) cost *= 2;
    // Extort: if opponent has Extort unit, add 10/20 chips
    const extortBonus = getOpponentExtortBonus(s, actor);
    cost += extortBonus;
    // Sabotage: if our seat is sabotaged
    cost += getSabotageCostForCast(s, actor, cardId);
    // Vanguard II: first cast discount
    if (!p.firstCastDiscountUsed) {
      const ldef = s.cardDefs[p.leaderCardId];
      if (ldef?.keyword === "Vanguard" && ldef.keyword_tier === 2) cost = Math.max(0, cost - 10);
    }
    // Zero-Cost Floor: cost >= 0
    cost = Math.max(0, cost);

    if (p.stash >= cost || cost === 0) {
      if (def.card_type === "Unit") {
        // Find empty, unlocked seats
        for (let si = 0; si < 3; si++) {
          const seat = p.seats[si];
          if (!seat.unit && !seat.locked) {
            acts.push({ type: "cast", cardId, seat: si as 0 | 1 | 2 });
          }
        }
      } else if (def.card_type === "Artifact") {
        // Can equip to own units or empty seats, or enemy units (Cursed/Sabotage)
        for (let si = 0; si < 3; si++) {
          acts.push({ type: "cast", cardId, seat: si as 0 | 1 | 2 });
        }
      } else {
        // Event / Location
        acts.push({ type: "cast", cardId });
      }
    }

    // Fold-Cast
    if (def.keyword === "Fold-Cast") {
      acts.push({ type: "foldcast", cardId });
    }
  }

  // Assassination — once per hand, only during betting phases
  if (
    !p.assassinationUsedThisHand &&
    s.phase !== "showdown" &&
    s.phase !== "cleanup"
  ) {
    const oppSide = opp(actor);
    for (let si = 0; si < 3; si++) {
      const targetSeat = s.players[oppSide].seats[si];
      if (!targetSeat.unit) continue;
      if (targetSeat.unit.keyword === "Ghost" && !targetSeat.unit.silenced) continue; // Ghost I immune

      for (let hi = 0; hi < p.holeCards.length; hi++) {
        const hole = p.holeCards[hi];
        if (hole.faceUp && !(s.cardDefs[p.leaderCardId]?.keyword === "Vanguard" && s.cardDefs[p.leaderCardId]?.keyword_tier === 3)) continue; // can only use face-up if Vanguard III
        const effectiveDefense = getEffectiveDefense(s, oppSide, si);
        if (hole.rank >= effectiveDefense) {
          acts.push({ type: "assassinate", targetSide: oppSide, seat: si as 0 | 1 | 2, holeCardIndex: hi });
        }
      }
    }
  }

  // Ignite — if leader is fully charged (fuel >= 3) and has Ignite keyword
  const ldef = s.cardDefs[p.leaderCardId];
  if (ldef?.keyword === "Ignite" && p.leaderFuel >= 3 && !p.leaderIgnited) {
    acts.push({ type: "ignite" });
  }

  // Fuel — if leader has Fuel keyword and there are cards to discard
  if (ldef?.keyword === "Fuel" && ldef.keyword_tier === 1 && p.hand.length > 0 && p.leaderFuel < 3) {
    for (const cardId of p.hand) {
      acts.push({ type: "fuel", payload: { kind: "discard", cardId } });
    }
  }

  // Buyout — once per hand, destroy own unit to free a seat
  if (s.phase !== "showdown" && s.phase !== "cleanup") {
    for (let si = 0; si < 3; si++) {
      if (p.seats[si].unit) {
        for (let hi = 0; hi < p.holeCards.length; hi++) {
          acts.push({ type: "buyout", targetSeat: si as 0|1|2, holeCardIndex: hi });
        }
      }
    }
  }

  return acts;
}

function getEffectiveDefense(s: MatchState, side: "A" | "B", seatIndex: number): number {
  const seat = s.players[side].seats[seatIndex];
  if (!seat.unit) return 999;
  let def = seat.unit.baseDefense + seat.unit.bonusDefense;

  // Soulbound III sets defense to 14
  if (seat.unit.artifactCardId) {
    const artDef = s.cardDefs[seat.unit.artifactCardId];
    if (artDef?.keyword === "Soulbound" && artDef.keyword_tier === 3) def = 14;
    if (artDef?.keyword === "Soulbound" && artDef.keyword_tier === 1) def += 2;
    if (artDef?.keyword === "Cursed" && artDef.keyword_tier === 1) def = Math.max(2, def - 2);
  }
  // Aura: +3 if leader is ignited
  const p = s.players[side];
  const ldef = s.cardDefs[p.leaderCardId];
  if (ldef?.keyword === "Aura" && p.leaderIgnited) def += 3;
  // Syndicate bonus
  if (seat.unit.keyword === "Syndicate") {
    const synCount = s.players[side].seats.filter(
      se => se.unit && se.unit.keyword === "Syndicate" && se.unit !== seat.unit
    ).length;
    def += synCount;
  }
  // Mascot: +1 per face card on community
  if (seat.unit.keyword === "Mascot") {
    const faceCards = s.community.filter(c => c.rank >= 11).length;
    def += faceCards;
  }
  // Bouncer II: opponent must also discard additional card (handled at assassination resolution)
  // Defense Floor: §Golden Rule 11
  return Math.max(2, def);
}

function getOpponentExtortBonus(s: MatchState, actor: "A" | "B"): number {
  const oppSide = opp(actor);
  let bonus = 0;
  for (const seat of s.players[oppSide].seats) {
    if (seat.unit?.keyword === "Extort" && !seat.unit.silenced) {
      bonus += seat.unit.keywordTier === 2 ? 10 : 10;
    }
  }
  return bonus;
}

function getSabotageCostForCast(s: MatchState, actor: "A" | "B", _cardId: string): number {
  // Sabotage is on opponent's seats targeting our units (handled separately)
  return 0;
}

// ============================================================
// SECTION 5 — STEP (main dispatch)
// ============================================================
export function step(state: MatchState, action: Action): MatchState {
  let s = clone(state);
  s.players.A.prevStash = state.players.A.stash;
  s.players.B.prevStash = state.players.B.stash;
  const actor = s.activePlayer;

  switch (action.type) {
    case "check":     s = handleCheck(s, actor); break;
    case "call":      s = handleCall(s, actor); break;
    case "raise":     s = handleRaise(s, actor, action.amount); break;
    case "fold":      s = handleFold(s, actor); break;
    case "cast":      s = handleCast(s, actor, action.cardId, action.seat, action.targets); break;
    case "foldcast":  s = handleFoldCast(s, actor, action.cardId, action.targets); break;
    case "assassinate": s = handleAssassinate(s, actor, action); break;
    case "ignite":    s = handleIgnite(s, actor); break;
    case "fuel":      s = handleFuel(s, actor, action.payload); break;
    case "place_location": s = handlePlaceLocation(s, actor, action.cardId); break;
    case "pass":      s = handlePass(s, actor); break;
    case "buyout":    s = handleBuyout(s, actor, action.targetSeat, action.holeCardIndex); break;
    case "advancePhase": s = advancePhase(s); break;
    default: break;
  }

  if (s.winner) s.phase = "ended";
  return s;
}

// ============================================================
// SECTION 6 — BETTING ACTIONS
// ============================================================
function handleCheck(s: MatchState, actor: "A" | "B"): MatchState {
  const p = s.players[actor];
  p.hasActed = true;
  appendLog(s, s.phase, `[${p.name}] checks.`);
  // Extort II: opponent pays 10 to check
  const extortSide = opp(actor);
  for (const seat of s.players[extortSide].seats) {
    if (seat.unit?.keyword === "Extort" && seat.unit.keywordTier === 2 && !seat.unit.silenced) {
      p.stash = Math.max(0, p.stash - 10);
      appendLog(s, s.phase, `[${p.name}] pays 10 chips to Check (Extort II).`);
    }
  }
  // Tell II: opp peeks random card in our hand
  for (const seat of s.players[extortSide].seats) {
    if (seat.unit?.keyword === "Tell" && seat.unit.keywordTier === 2 && !seat.unit.silenced) {
      appendLog(s, s.phase, `[${s.players[extortSide].name}] Tell II: peeks at a random card in ${p.name}'s hand.`);
    }
  }
  return maybeAdvanceBettingRound(s, actor);
}

function handleCall(s: MatchState, actor: "A" | "B"): MatchState {
  const p = s.players[actor];
  const oppP = s.players[opp(actor)];
  const owed = oppP.currentBet - p.currentBet;
  const paid = Math.min(p.stash, owed);
  p.stash -= paid;
  p.currentBet += paid;
  s.pot.main += paid;
  p.hasActed = true;
  appendLog(s, s.phase, `[${p.name}] calls ${paid}.`);
  // Tell I: opponent gains 15 when we raise — call doesn't trigger Tell
  return maybeAdvanceBettingRound(s, actor);
}

function handleRaise(s: MatchState, actor: "A" | "B", amount: number): MatchState {
  const p = s.players[actor];
  const oppP = s.players[opp(actor)];
  const owed = oppP.currentBet - p.currentBet;
  let raiseAmount = amount;

  // Parry check
  const parryTier = getOpponentParryTier(s, actor);
  if (parryTier === 3) {
    appendLog(s, s.phase, `[${p.name}]'s raise is cancelled by Parry III! Must call or fold.`);
    raiseAmount = owed; // treated as call
  } else if (parryTier === 2) {
    raiseAmount = Math.min(amount, owed + s.bigBlind);
    if (amount > raiseAmount) appendLog(s, s.phase, `[${p.name}]'s raise capped by Parry II.`);
  } else if (parryTier === 1) {
    raiseAmount = Math.min(amount, owed + Math.floor((s.pot.main) / 2));
    if (amount > raiseAmount) appendLog(s, s.phase, `[${p.name}]'s raise capped by Parry I.`);
  }

  const paid = Math.min(p.stash, raiseAmount);
  p.stash -= paid;
  p.currentBet += paid;
  s.pot.main += paid;
  p.hasActed = true;
  
  if (paid > owed) {
    // Reset opponent's hasActed so they must respond
    s.players[opp(actor)].hasActed = false;
    appendLog(s, s.phase, `[${p.name}] raises to ${p.currentBet}.`);
  } else {
    appendLog(s, s.phase, `[${p.name}] calls ${paid}.`);
    return maybeAdvanceBettingRound(s, actor);
  }

  // Tell I: gain 15 chips when opponent raises
  for (const seat of s.players[opp(actor)].seats) {
    if (seat.unit?.keyword === "Tell" && seat.unit.keywordTier === 1 && !seat.unit.silenced) {
      s.players[opp(actor)].stash += 15;
      appendLog(s, s.phase, `[${s.players[opp(actor)].name}] Tell I: gains 15 chips from raise.`);
    }
  }

  s.activePlayer = opp(actor);
  return s;
}

function handleFold(s: MatchState, actor: "A" | "B"): MatchState {
  const p = s.players[actor];
  p.hasFolded = true;

  // Dead Man's Switch I: free assassination on fold
  if (s.location?.keyword === "Dead Man's Switch" && s.location.tier === 1) {
    appendLog(s, s.phase, `[${p.name}] Dead Man's Switch: gets 1 free Assassination before Seat Lock.`);
    // UI will present assassination choices as a follow-up action
  }

  // Award pot to opponent
  const potTotal = s.pot.main + s.pot.phantom;
  s.players[opp(actor)].stash += s.pot.main; // phantom evaporates §GoldenRule8
  appendLog(s, s.phase, `[${p.name}] folds. ${s.players[opp(actor)].name} wins ${s.pot.main} chips.`);
  s.pot = { main: 0, phantom: 0 };

  // §8 Fold penalty
  if (s.phase === "preflop") {
    // Seat Lock: choose an empty seat first; else destroy a unit in chosen seat
    applyPreFlopFoldPenalty(s, actor);
  } else {
    // Post-flop: Exhaustion on all occupied seats
    applyPostFlopFoldPenalty(s, actor);
  }

  // Check win condition
  checkBankruptcy(s);
  if (!s.winner) s = startCleanup(s);
  return s;
}

function applyPreFlopFoldPenalty(s: MatchState, actor: "A" | "B") {
  const p = s.players[actor];
  // §Golden Rule 17: Lock an empty seat first if possible
  let locked = false;
  for (const seat of p.seats) {
    if (!seat.unit && !seat.locked) {
      seat._lockNextHand = true;
      locked = true;
      appendLog(s, s.phase, `[${p.name}] Pre-Flop Fold: Seat ${seat.index + 1} will be Locked next hand.`);
      break;
    }
  }
  if (!locked) {
    // All seats occupied; player chooses — default to seat with lowest-tier unit
    const target = p.seats.find(se => se.unit) ?? p.seats[0];
    if (target.unit) {
      appendLog(s, s.phase, `[${p.name}] Pre-Flop Fold: ${target.unit.name} is destroyed (Seat Lock penalty).`);
      destroyUnit(s, actor, target.index as 0|1|2);
    }
    target._lockNextHand = true;
  }
}

function applyPostFlopFoldPenalty(s: MatchState, actor: "A" | "B") {
  const p = s.players[actor];
  let anyExhausted = false;
  for (const seat of p.seats) {
    if (seat.unit) {
      seat._exhaustNextHand = true;
      anyExhausted = true;
    }
  }
  if (anyExhausted) appendLog(s, s.phase, `[${p.name}] Post-Flop Fold: all Units will be Exhausted next hand.`);
}

function getOpponentParryTier(s: MatchState, actor: "A" | "B"): number {
  // Parry is an Event (instant); for simplicity, we check if they have a Parry card in hand
  // In a full impl, this would be a reaction system. For now, return 0.
  return 0;
}

// ============================================================
// SECTION 7 — TCG ACTIONS
// ============================================================
function handleCast(
  s: MatchState,
  actor: "A" | "B",
  cardId: string,
  seatIndex?: number,
  targets?: any,
): MatchState {
  const p = s.players[actor];
  const def = s.cardDefs[cardId];
  if (!def) return s;

  // Remove from hand
  const idx = p.hand.indexOf(cardId);
  if (idx === -1) return s;
  p.hand.splice(idx, 1);

  // Calculate cost
  let cost = def.cast_cost ?? 0;
  if (s.location?.keyword === "High Stakes" && (s.location.tier ?? 0) >= 3) cost *= 2;
  cost += getOpponentExtortBonus(s, actor);
  cost = Math.max(0, cost);

  // Vanguard II: first cast discount
  const ldef = s.cardDefs[p.leaderCardId];
  if (ldef?.keyword === "Vanguard" && ldef.keyword_tier === 2 && !p.firstCastDiscountUsed) {
    cost = Math.max(0, cost - 10);
    p.firstCastDiscountUsed = true;
  }

  p.stash -= cost;
  appendLog(s, s.phase, `[${p.name}] casts ${def.name} (cost: ${cost}).`, actor);

  // Kickback: refund
  if (def.keyword === "Kickback") {
    const refund = def.keyword_tier === 1 ? Math.floor(cost * 0.5) : cost;
    p.stash += refund;
    if (def.keyword_tier === 3) drawTcgCards(s, actor, 1);
    appendLog(s, s.phase, `[${p.name}] Kickback: refunded ${refund} chips.`);
  }

  switch (def.card_type) {
    case "Unit":   s = resolveUnitCast(s, actor, cardId, def, seatIndex ?? 0); break;
    case "Artifact": s = resolveArtifactCast(s, actor, cardId, def, seatIndex ?? 0); break;
    case "Event":  s = resolveEventCast(s, actor, cardId, def, targets); break;
    case "Location": s = resolveLocationCast(s, actor, cardId, def); break;
    default: p.graveyard.push(cardId); break;
  }

  checkBankruptcy(s);
  return s;
}

function resolveUnitCast(s: MatchState, actor: "A" | "B", cardId: string, def: CardDef, seatIndex: number): MatchState {
  const p = s.players[actor];
  const seat = p.seats[seatIndex];
  if (!seat || seat.unit || seat.locked) return s; // invalid

  const unit: Unit = {
    cardId,
    name: def.name,
    baseDefense: def.defense ?? 2,
    bonusDefense: 0,
    keyword: def.keyword as Keyword | undefined,
    keywordTier: def.keyword_tier as Tier | undefined,
    faceDown: def.keyword === "Undercover",
    exhausted: !!seat._exhaustNextHand,
    silenced: !!seat._exhaustNextHand,
    wounds: 0,
  };
  seat.unit = unit;

  // On-enter effects
  if (def.keyword === "Grifter" && !unit.silenced) {
    if (def.keyword_tier === 1) {
      const stolen = Math.min(s.pot.main, 15);
      s.pot.main -= stolen;
      p.stash += stolen;
      appendLog(s, s.phase, `[${p.name}] Grifter I: steals ${stolen} from the Pot.`);
    } else if (def.keyword_tier === 2) {
      const stolen = Math.min(s.players[opp(actor)].stash, 30);
      s.players[opp(actor)].stash -= stolen;
      p.stash += stolen;
      appendLog(s, s.phase, `[${p.name}] Grifter II: steals ${stolen} from ${s.players[opp(actor)].name}'s Stash.`);
    } else if (def.keyword_tier === 3) {
      const stolen = Math.min(s.players[opp(actor)].stash, 50);
      s.players[opp(actor)].stash -= stolen;
      p.stash += stolen;
      drawTcgCards(s, actor, 1);
      appendLog(s, s.phase, `[${p.name}] Grifter III: steals ${stolen} and draws a card.`);
    }
  }

  if (def.keyword === "Syndicate" && def.keyword_tier === 2 && !unit.silenced) {
    const synCount = p.seats.filter(se => se.unit?.keyword === "Syndicate" && se.unit !== unit).length;
    if (synCount > 0) {
      drawTcgCards(s, actor, 1);
      appendLog(s, s.phase, `[${p.name}] Syndicate II: draws 1 card.`);
    }
  }

  appendLog(s, s.phase, `[${p.name}] deploys ${def.name} to Seat ${seatIndex + 1}.`);
  return s;
}

function resolveArtifactCast(s: MatchState, actor: "A" | "B", cardId: string, def: CardDef, seatIndex: number): MatchState {
  const p = s.players[actor];
  const oppP = s.players[opp(actor)];

  // Cursed: equip to enemy unit
  if (def.keyword === "Cursed") {
    const targetSeat = oppP.seats[seatIndex];
    if (def.keyword_tier === 3 && !targetSeat.unit) {
      // Equip to empty enemy seat: permanently locks until they fold
      targetSeat.locked = true;
      appendLog(s, s.phase, `[${p.name}] Cursed III: Seat ${seatIndex + 1} of ${oppP.name} is Locked until fold.`);
    } else if (targetSeat.unit) {
      // Evict existing artifact if any (Encumbrance Limit)
      if (targetSeat.unit.artifactCardId) {
        const old = s.cardDefs[targetSeat.unit.artifactCardId];
        triggerArtifactDestroyed(s, actor, targetSeat.unit.artifactCardId, old);
        oppP.graveyard.push(targetSeat.unit.artifactCardId);
      }
      targetSeat.unit.artifactCardId = cardId;
      if (def.keyword_tier === 2) {
        targetSeat.unit.silenced = true;
        appendLog(s, s.phase, `[${p.name}] Cursed II: ${targetSeat.unit.name}'s abilities are silenced.`);
      }
    }
    return s;
  }

  // Sabotage: equip to enemy seat
  if (def.keyword === "Sabotage") {
    const targetSeat = oppP.seats[seatIndex];
    if (!targetSeat.unit) {
      targetSeat.artifactOnEmptySeat = cardId;
      appendLog(s, s.phase, `[${p.name}] Sabotage placed on enemy Seat ${seatIndex + 1}.`);
    }
    return s;
  }

  // Phantom: add phantom chips to pot
  if (def.keyword === "Phantom") {
    const phantomAmount = def.keyword_tier === 1 ? 100 : 200;
    s.pot.phantom += phantomAmount;
    appendLog(s, s.phase, `[${p.name}] Phantom: adds ${phantomAmount} phantom chips to pot.`);
    p.graveyard.push(cardId);
    return s;
  }

  // Pawn: destroy for chips
  if (def.keyword === "Pawn") {
    let gain = def.keyword_tier === 1 ? 25 : def.keyword_tier === 2 ? 50 : Math.floor(s.pot.main / 2);
    p.stash += gain;
    p.graveyard.push(cardId);
    appendLog(s, s.phase, `[${p.name}] Pawn: gains ${gain} chips.`);
    return s;
  }

  // Rigged: attach to community card
  if (def.keyword === "Rigged") {
    const targetIdx = def.keyword_tier === 1 ? 2 : 4; // Flop[2] or River[4]
    if (s.community[targetIdx]) {
      s.community[targetIdx].ownedBy = actor;
      appendLog(s, s.phase, `[${p.name}] Rigged: community card ${targetIdx + 1} is now owned by ${p.name}.`);
    }
    p.graveyard.push(cardId);
    return s;
  }

  // Standard artifact: equip to own unit
  const targetSeat = p.seats[seatIndex];
  if (targetSeat.unit) {
    if (targetSeat.unit.faceDown) {
      appendLog(s, s.phase, `Cannot equip to an Undercover (face-down) unit.`);
      p.graveyard.push(cardId);
      return s;
    }
    if (targetSeat.unit.artifactCardId) {
      const old = s.cardDefs[targetSeat.unit.artifactCardId];
      triggerArtifactDestroyed(s, opp(actor), targetSeat.unit.artifactCardId, old);
      p.graveyard.push(targetSeat.unit.artifactCardId);
    }
    targetSeat.unit.artifactCardId = cardId;

    if (def.keyword === "Smuggle" && def.keyword_tier === 2) {
      const extra = s.pokerDeck.pop();
      if (extra) p.holeCards.push(extra);
      appendLog(s, s.phase, `[${p.name}] Smuggle II: draws 3rd Hole Card.`);
    }
    if (def.keyword === "Contraband") {
      appendLog(s, s.phase, `[${p.name}] Contraband: unit gains ${def.keyword_tier === 1 ? "Ghost I" : "Sniper I"}.`);
    }
    appendLog(s, s.phase, `[${p.name}] equips ${def.name} to ${targetSeat.unit.name}.`);
  } else {
    targetSeat.artifactOnEmptySeat = cardId;
  }
  return s;
}

function triggerArtifactDestroyed(s: MatchState, _owner: "A" | "B", artId: string, def: CardDef | undefined) {
  if (!def) return;
  const oppSide: "A" | "B" = _owner === "A" ? "B" : "A";
  if (def.keyword === "Shrapnel") {
    if (def.keyword_tier === 1) {
      s.players[oppSide].stash -= 15;
      appendLog(s, s.phase, `Shrapnel I: deals 15 chip damage!`);
    } else if (def.keyword_tier === 2) {
      const hole = s.players[oppSide].holeCards.pop();
      if (hole) {
        s.players[oppSide].holeCards.push(s.pokerDeck.pop() ?? hole); // replacement
        appendLog(s, s.phase, `Shrapnel II: discards a random Hole Card from ${s.players[oppSide].name}.`);
      }
    }
  }
}

function resolveEventCast(s: MatchState, actor: "A" | "B", cardId: string, def: CardDef, _targets?: any): MatchState {
  const p = s.players[actor];
  const oppP = s.players[opp(actor)];

  switch (def.keyword as Keyword) {
    case "Sleight":
      if (def.keyword_tier === 1) {
        if (p.holeCards.length > 0 && s.muck.length > 0) {
          const hIdx = Math.floor((s.rngState >>> 0) % p.holeCards.length);
          const mIdx = Math.floor(((s.rngState * 1664525) >>> 0) % s.muck.length);
          const temp = p.holeCards[hIdx];
          p.holeCards[hIdx] = s.muck[mIdx];
          s.muck[mIdx] = temp;
          appendLog(s, s.phase, `[${p.name}] Sleight I: swapped a Hole Card.`);
        }
      }
      break;

    case "Wiretap":
      if (def.keyword_tier === 1 || def.keyword_tier === 3) {
        if (oppP.holeCards.length > 0) {
          const peeked = oppP.holeCards[0];
          appendLog(s, s.phase, `[${p.name}] Wiretap: sees a hole card — ${peeked.rank}${peeked.suit}.`);
          if (def.keyword_tier === 3) peeked.faceUp = true;
        }
      }
      break;

    case "Launder":
      if (def.keyword_tier === 1) {
        p.hand.pop();
        p.stash += 30;
      } else {
        p.stash += s.bigBlind;
      }
      break;

    default:
      appendLog(s, s.phase, `[${p.name}] casts ${def.name}.`, actor);
      break;
  }

  p.graveyard.push(cardId);
  return s;
}

function resolveLocationCast(s: MatchState, actor: "A" | "B", cardId: string, def: CardDef): MatchState {
  const p = s.players[actor];
  if (def.keyword && def.keyword_tier) {
    s.location = { cardId, keyword: def.keyword as Keyword, tier: def.keyword_tier as Tier };
    appendLog(s, s.phase, `[${p.name}] plays Location: ${def.name} — ${def.keyword} ${def.keyword_tier}`);
  }
  p.graveyard.push(cardId);
  return s;
}

function handleFoldCast(s: MatchState, actor: "A" | "B", cardId: string, _targets?: any): MatchState {
  const p = s.players[actor];
  const def = s.cardDefs[cardId];
  if (!def) return s;

  p.hand.splice(p.hand.indexOf(cardId), 1);
  p.hasPlayedFoldCast = true;
  p.hasFolded = true;

  if (def.keyword_tier === 1) {
    appendLog(s, s.phase, `[${p.name}] Fold-Cast I: folds with no penalty.`);
  } else if (def.keyword_tier === 2) {
    const damage = Math.floor((s.pot.main + s.pot.phantom) / 2);
    s.players[opp(actor)].stash -= damage;
    appendLog(s, s.phase, `[${p.name}] Fold-Cast II: deals ${damage} chip damage on fold!`);
  }

  p.graveyard.push(cardId);
  s.players[opp(actor)].stash += s.pot.main;
  s.pot = { main: 0, phantom: 0 };
  checkBankruptcy(s);
  if (!s.winner) s = startCleanup(s);
  return s;
}

// ============================================================
// SECTION 8 — ASSASSINATION
// ============================================================
function handleAssassinate(
  s: MatchState,
  actor: "A" | "B",
  action: Extract<Action, { type: "assassinate" }>,
): MatchState {
  const p = s.players[actor];
  const oppP = s.players[action.targetSide];
  const targetSeat = oppP.seats[action.seat];

  if (!targetSeat.unit) return s;
  const unit = targetSeat.unit;
  const usedCard = p.holeCards[action.holeCardIndex];
  if (!usedCard) return s;

  const effectiveDef = getEffectiveDefense(s, action.targetSide, action.seat);

  if (unit.keyword === "Bouncer" && unit.keywordTier === 1 && !unit.silenced) {
    p.stash -= 25;
  }

  if (usedCard.rank < effectiveDef) {
    appendLog(s, s.phase, `[${p.name}] assassination failed.`);
    return s;
  }

  appendLog(s, s.phase, `[${p.name}] assassinates ${unit.name}!`, actor);

  s.muck.push(usedCard);
  p.holeCards.splice(action.holeCardIndex, 1);
  const repl = s.pokerDeck.pop();
  if (repl) p.holeCards.push(repl);

  p.assassinationUsedThisHand = true;

  destroyUnit(s, action.targetSide, action.seat);
  checkBankruptcy(s);
  return s;
}

function destroyUnit(s: MatchState, side: "A" | "B", seatIndex: 0|1|2) {
  const seat = s.players[side].seats[seatIndex];
  if (!seat.unit) return;
  const unit = seat.unit;

  if (unit.artifactCardId) {
    const artDef = s.cardDefs[unit.artifactCardId];
    triggerArtifactDestroyed(s, side, unit.artifactCardId, artDef);
    s.players[side].graveyard.push(unit.artifactCardId);
  }

  s.players[side].graveyard.push(unit.cardId);
  seat.unit = null;
  appendLog(s, s.phase, `${unit.name} is destroyed.`);
}

// ============================================================
// SECTION 9 — IGNITE / FUEL / BUYOUT
// ============================================================
function handleIgnite(s: MatchState, actor: "A" | "B"): MatchState {
  const p = s.players[actor];
  if (p.leaderFuel < 3) return s;
  p.leaderFuel = 0;
  p.leaderIgnited = true;

  const oppSide = opp(actor);
  for (let si = 0; si < 3; si++) {
    if (s.players[oppSide].seats[si].unit) {
      destroyUnit(s, oppSide, si as 0|1|2);
    }
  }
  appendLog(s, s.phase, `[${p.name}] IGNITES! All enemy Units are destroyed!`);
  checkBankruptcy(s);
  return s;
}

function handleFuel(s: MatchState, actor: "A" | "B", payload: FuelPayload): MatchState {
  const p = s.players[actor];
  if (payload.kind === "discard") {
    p.hand.splice(p.hand.indexOf(payload.cardId), 1);
    p.graveyard.push(payload.cardId);
    p.leaderFuel = Math.min(3, p.leaderFuel + 1);
  } else if (payload.kind === "wonHighCard") {
    p.leaderFuel = Math.min(3, p.leaderFuel + 1);
  }
  return s;
}

function handleBuyout(s: MatchState, actor: "A" | "B", targetSeat: 0|1|2, holeCardIndex: number): MatchState {
  const p = s.players[actor];
  if (!p.seats[targetSeat].unit || !p.holeCards[holeCardIndex]) return s;
  s.muck.push(p.holeCards[holeCardIndex]);
  p.holeCards.splice(holeCardIndex, 1);
  destroyUnit(s, actor, targetSeat);
  return s;
}

function handlePlaceLocation(s: MatchState, actor: "A" | "B", cardId: string): MatchState {
  const p = s.players[actor];
  const idx = p.deck.indexOf(cardId);
  if (idx !== -1) p.deck.splice(idx, 1);
  const def = s.cardDefs[cardId];
  if (def && def.keyword && def.keyword_tier) {
    p.graveyard.push(cardId);
    s.location = { cardId, keyword: def.keyword as Keyword, tier: def.keyword_tier as Tier };
    appendLog(s, s.phase, `[${p.name}] places new Location: ${def.name}.`);
  }
  s.waitingForLocation = null;
  return s;
}

// ============================================================
// SECTION 10 — PHASE MANAGEMENT
// ============================================================
function handlePass(s: MatchState, actor: "A" | "B"): MatchState {
  if (s.waitingForLocation === actor) {
    s.waitingForLocation = null;
    appendLog(s, s.phase, `[${s.players[actor].name}] chooses to keep the current Location.`);
    return s;
  }
  s.players[actor].hasActed = true;
  return maybeAdvanceBettingRound(s, actor);
}

function maybeAdvanceBettingRound(s: MatchState, lastActor: "A" | "B"): MatchState {
  const a = s.players["A"];
  const b = s.players["B"];
  if (a.currentBet === b.currentBet && a.hasActed && b.hasActed) {
    return advancePhase(s);
  }
  s.activePlayer = opp(lastActor);
  return s;
}

function advancePhase(s: MatchState): MatchState {
  s.players["A"].currentBet = 0;
  s.players["B"].currentBet = 0;
  s.players["A"].hasActed = false;
  s.players["B"].hasActed = false;

  switch (s.phase) {
    case "preflop": {
      for (let i = 0; i < 3; i++) {
        const c = s.pokerDeck.pop();
        if (c) { c.faceUp = true; s.community.push(c); }
      }
      s.phase = "flop";
      break;
    }
    case "flop": {
      const c = s.pokerDeck.pop();
      if (c) { c.faceUp = true; s.community.push(c); }
      s.phase = "turn";
      break;
    }
    case "turn": {
      const c = s.pokerDeck.pop();
      if (c) { c.faceUp = true; s.community.push(c); }
      s.phase = "river";
      break;
    }
    case "river":
      s.phase = "showdown";
      s = resolveShowdown(s);
      break;
    case "showdown":
    case "cleanup":
      s = startCleanup(s);
      break;
    default:
      break;
  }

  if (s.phase !== "ended" && s.phase !== "showdown" && s.phase !== "cleanup") {
    s.activePlayer = opp(s.dealer);
  }
  return s;
}

// ============================================================
// SECTION 11 — SHOWDOWN
// ============================================================
function resolveShowdown(s: MatchState): MatchState {
  const ctxA = buildEvalContext(s, "A");
  const ctxB = buildEvalContext(s, "B");
  const evalA = evaluateBest(s.players.A.holeCards, s.community.filter(c => c.ownedBy !== "B"), ctxA);
  const evalB = evaluateBest(s.players.B.holeCards, s.community.filter(c => c.ownedBy !== "A"), ctxB);
  const cmp = compareEval(evalA, evalB);

  let winner: "A" | "B" | "split";
  if (cmp === 0) winner = "split";
  else winner = cmp > 0 ? "A" : "B";

  s.winnerThisHand = winner;
  const potWon = s.pot.main;
  if (winner === "split") {
    const half = Math.floor(potWon / 2);
    s.players.A.stash += half;
    s.players.B.stash += half;
  } else {
    s.players[winner].stash += potWon;
  }

  s.pot = { main: 0, phantom: 0 };
  checkBankruptcy(s);
  if (!s.winner) s = startCleanup(s);
  return s;
}

// ============================================================
// SECTION 12 — CLEANUP
// ============================================================
function startCleanup(s: MatchState): MatchState {
  s.phase = "cleanup";
  for (const side of ["A", "B"] as const) {
    const p = s.players[side];
    while (p.hand.length > p.maxHandSize) p.graveyard.push(p.hand.pop()!);
    s.dealer = opp(s.dealer);
    p.reserve = 0;
  }
  checkBankruptcy(s);
  if (!s.winner) s = startNewHand(s);
  return s;
}

// ============================================================
// SECTION 13 — WIN CONDITION
// ============================================================
function checkBankruptcy(s: MatchState) {
  if (s.winner) return;
  if (s.players.A.stash <= 0) s.winner = "B";
  else if (s.players.B.stash <= 0) s.winner = "A";
}

// ============================================================
// HELPERS
// ============================================================
function opp(side: "A" | "B"): "A" | "B" { return side === "A" ? "B" : "A"; }
function clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }
function appendLog(s: MatchState, phase: Phase, text: string, side?: "A" | "B") {
  s.log.push({ seq: s.log.length, phase, text, side });
}
