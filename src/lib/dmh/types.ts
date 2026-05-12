// Dead Man's Hand — shared types
// Pure TS, no React, no DOM, no Supabase. Safe to use in Deno edge functions.

// ---- Cards ----------------------------------------------------------------

export type CardType = 'Unit' | 'Event' | 'Location' | 'Artifact' | 'Leader';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Super-Rare' | 'Mythic' | 'Divine';
export type PowerGrade = 'S' | 'A' | 'B' | 'C';

export type Keyword =
  // Leader
  | 'Vanguard' | 'Fuel' | 'Ignite' | 'Aura' | 'Ultimatum' | 'Martyr' | 'Desperado' | 'Prophet'
  // Location
  | 'Restriction' | 'Suit-Shift' | 'Blind-River' | 'Sanctuary' | 'Black Market'
  | 'High Stakes' | 'Jackpot' | 'Bad Beat' | 'Blood Feud' | 'Wildcard'
  | "Dead Man's Switch" | 'Standoff'
  // Unit
  | 'Dealer' | 'Bouncer' | 'Tell' | 'Grifter' | 'Enforcer' | 'Undercover'
  | 'High Roller' | 'Reckless' | 'Mercenary' | 'Sniper' | 'Ghost' | 'Bodyguard'
  | 'Syndicate' | 'Mascot' | 'Nomad' | 'Extort'
  // Event
  | 'Sleight' | 'Fold-Cast' | 'Parry' | 'Wiretap' | 'Kickback' | 'All-In'
  | 'Faustian' | 'Counterfeit' | 'Bribe' | 'Audit' | 'Launder' | 'Scavenge' | 'Mill' | 'Roulette'
  // Artifact
  | 'Phantom' | 'Rigged' | 'Pawn' | 'Cursed' | 'Concealed' | 'Soulbound'
  | 'Vault' | 'Sabotage' | 'Contraband' | 'Shrapnel' | 'Smuggle';

export type Tier = 1 | 2 | 3;

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  card_type: CardType;
  image_url: string;
  keyword?: Keyword;
  keyword_tier?: Tier;
  cast_cost: number;
  defense?: number; // Units only
  effect_text?: string;
  power_grade?: PowerGrade;
}

// ---- Poker ----------------------------------------------------------------

export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
export type Rank = 2|3|4|5|6|7|8|9|10|11|12|13|14; // 11=J 12=Q 13=K 14=A

export interface PokerCard {
  rank: Rank;
  suit: Suit;
  faceUp: boolean;
  wild?: boolean;       // computed by Wildcard location
  ownedBy?: PlayerSide; // for Rigged Tier I
}

export type HandRank =
  | 'high-card' | 'pair' | 'two-pair' | 'three-kind' | 'straight'
  | 'flush' | 'full-house' | 'four-kind' | 'straight-flush' | 'royal-flush';

export const HAND_RANK_ORDER: HandRank[] = [
  'high-card','pair','two-pair','three-kind','straight','flush',
  'full-house','four-kind','straight-flush','royal-flush'
];

// ---- Players, Seats, Board ------------------------------------------------

export type PlayerSide = 'A' | 'B';

export interface Unit {
  cardId: string;
  name: string;
  baseDefense: number;
  bonusDefense: number;        // from keywords (Syndicate, Mascot, …) — recomputed per phase
  keyword?: Keyword;
  keywordTier?: Tier;
  faceDown: boolean;           // Undercover
  exhausted: boolean;          // post-fold seat-exhaustion
  silenced: boolean;           // Cursed II; also seat-exhaustion silence
  wounds: number;              // for Reckless II "unkillable" tracking
  artifactCardId?: string;     // single equipped artifact (Encumbrance Limit)
}

export interface Seat {
  index: 0 | 1 | 2;            // 3-seat casino floor
  unit: Unit | null;
  locked: boolean;             // from fold penalty / Cursed III
  artifactOnEmptySeat?: string; // Cursed III, Sabotage on empty seat
  _lockNextHand?: boolean;      // set during fold, applied at startNewHand
  _exhaustNextHand?: boolean;   // set during post-flop fold, applied at startNewHand
}

export interface Player {
  id: string;
  name: string;
  side: PlayerSide;
  isCpu: boolean;
  // Resources
  stash: number;               // chips
  prevStash?: number;          // for UI animations
  reserve: number;             // Rule 1: Dead Man's Pockets
  vault: number;               // Vault keyword storage
  // Card zones
  deck: string[];              // TCG cardIds, top of deck = index 0
  hand: string[];              // TCG cards in hand
  graveyard: string[];
  exiled: string[];
  // Board
  leaderCardId: string;
  leaderWounds: number;        // void-draw rule
  leaderFuel: number;          // 0..3 e.g. for Ignite
  leaderIgnited: boolean;
  seats: [Seat, Seat, Seat];
  // Poker
  holeCards: PokerCard[];      // 2 normally; Smuggle II → 3
  // Per-hand state
  fatigueTokens: number;       // Faustian I drawback
  maxHandSize: number;         // default 7; Faustian II reduces
  hasFolded: boolean;
  hasPlayedFoldCast: boolean;
  // Per-betting-round state
  currentBet: number;
  hasActed: boolean;           // for betting round termination
  // Permanent
  cannotFold: boolean;         // Faustian III absolute drawback
  cannotBetOrRaise: boolean;   // Reckless III drawback
  assassinationUsedThisHand: boolean; // §7: only 1 assassination per hand
  firstCastDiscountUsed: boolean;      // Vanguard II: first cast -10 chips
  cardBackImageUrl?: string;           // cosmetic
}

// ---- Match state ----------------------------------------------------------

export type Phase =
  | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'cleanup' | 'ended';

export interface Pot {
  main: number;
  phantom: number; // evaporates at showdown (Rule 8)
}

export interface LocationCard {
  cardId: string;
  keyword: Keyword;
  tier: Tier;
}

export interface MatchState {
  matchId: string;
  seed: number;                  // RNG seed for this match
  rngState: number;              // current RNG state
  players: { A: Player; B: Player };
  activePlayer: PlayerSide;
  dealer: PlayerSide;            // small blind position
  phase: Phase;
  handNumber: number;
  // Community
  community: PokerCard[];        // length 0..5
  pokerDeck: PokerCard[];
  muck: PokerCard[];
  // Location card (single, persistent for the whole game)
  location: LocationCard | null;
  waitingForLocation?: PlayerSide | null;
  // Pot
  pot: Pot;
  bigBlind: number;              // doubled by High Stakes
  cardDefs: Record<string, CardDef>; // all card definitions by ID — needed by engine
  // Showdown
  winnerThisHand: PlayerSide | 'split' | null;
  // Logs
  log: GameLogEntry[];
  // Termination
  winner: PlayerSide | null;
  endedReason?: string;
}

export interface GameLogEntry {
  seq: number;
  phase: Phase;
  text: string;
  side?: PlayerSide;
}

// ---- Actions --------------------------------------------------------------

export type Action =
  | { type: 'cast'; cardId: string; targets?: TargetRef[]; seat?: 0|1|2 }
  | { type: 'foldcast'; cardId: string; targets?: TargetRef[] }
  | { type: 'bet'; amount: number }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number }
  | { type: 'fold' }
  | { type: 'assassinate'; targetSide: PlayerSide; seat: 0|1|2; holeCardIndex: number; secondHoleCardIndex?: number }
  | { type: 'ignite' }
  | { type: 'fuel'; payload: FuelPayload }
  | { type: 'buyout'; targetSeat: 0|1|2; holeCardIndex: number }
  | { type: 'place_location'; cardId: string }
  | { type: 'pass' }
  | { type: 'startMatch' }
  | { type: 'startHand' }
  | { type: 'advancePhase' };

export type TargetRef =
  | { kind: 'unit'; side: PlayerSide; seat: 0|1|2 }
  | { kind: 'leader'; side: PlayerSide }
  | { kind: 'community'; index: 0|1|2|3|4 }
  | { kind: 'hole'; side: PlayerSide; index: number }
  | { kind: 'pot' };

export type FuelPayload =
  | { kind: 'discard'; cardId: string }
  | { kind: 'wonHighCard' }
  | { kind: 'aceAssassinate' };

// ---- AI -------------------------------------------------------------------

export type CpuDifficulty = 'easy' | 'normal' | 'hard';

// ---- Helpers --------------------------------------------------------------

export function rankToString(r: Rank): string {
  return r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : r === 14 ? 'A' : String(r);
}

export function suitSymbol(s: Suit): string {
  return s === 'S' ? '♠' : s === 'H' ? '♥' : s === 'D' ? '♦' : '♣';
}
