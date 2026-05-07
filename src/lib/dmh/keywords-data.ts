// All 18 keywords × 1-3 tiers, encoded as data so the engine can dispatch on keyword+tier.
// Effect text mirrors the appendix verbatim. Effect *handlers* are in engine.ts.

import type { Keyword, Tier, PowerGrade, CardType } from './types';

export interface KeywordTierDef {
  keyword: Keyword;
  tier: Tier;
  category: CardType;
  power_grade: PowerGrade;
  effect_text: string;
  /** When the effect can fire. 'manual' means the player triggers it via an action. */
  trigger: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'cleanup'
         | 'on_enter' | 'on_destroy' | 'on_target' | 'continuous'
         | 'manual' | 'on_opponent_raise' | 'on_opponent_check' | 'on_opponent_event'
         | 'on_fold' | 'on_assassinate' | 'on_betting' | 'on_cast';
  anti_synergies: Keyword[];
}

export const KEYWORDS: Record<Keyword, Partial<Record<Tier, KeywordTierDef>>> = {
  // -------------------- LEADER --------------------
  Vanguard: {
    1: { keyword:'Vanguard', tier:1, category:'Leader', power_grade:'B',
         effect_text:'Peek at the top card of the TCG deck at the start of Pre-Flop.',
         trigger:'preflop', anti_synergies:['Reckless'] },
    2: { keyword:'Vanguard', tier:2, category:'Leader', power_grade:'B',
         effect_text:'Your first Cast each hand costs 10 fewer chips.',
         trigger:'continuous', anti_synergies:['Reckless'] },
    3: { keyword:'Vanguard', tier:3, category:'Leader', power_grade:'B',
         effect_text:'You may use Face-Up Hole Cards to execute Assassinations.',
         trigger:'continuous', anti_synergies:['Reckless'] }
  },
  Fuel: {
    1: { keyword:'Fuel', tier:1, category:'Leader', power_grade:'B',
         effect_text:'Discard a TCG card to charge your Leader.',
         trigger:'manual', anti_synergies:['Faustian'] },
    2: { keyword:'Fuel', tier:2, category:'Leader', power_grade:'B',
         effect_text:'Win with a High Card to charge your Leader.',
         trigger:'showdown', anti_synergies:['Faustian'] },
    3: { keyword:'Fuel', tier:3, category:'Leader', power_grade:'B',
         effect_text:'Assassinate with an Ace to charge your Leader.',
         trigger:'on_assassinate', anti_synergies:['Faustian'] }
  },
  Ignite: {
    1: { keyword:'Ignite', tier:1, category:'Leader', power_grade:'A',
         effect_text:'Spend a fully-charged Leader: instantly destroy all enemy Units.',
         trigger:'manual', anti_synergies:['Fold-Cast'] }
  },
  Aura: {
    1: { keyword:'Aura', tier:1, category:'Leader', power_grade:'A',
         effect_text:'While your Leader is Ignited, your Units gain +3 Defense.',
         trigger:'continuous', anti_synergies:['Fold-Cast'] }
  },
  Ultimatum: {
    1: { keyword:'Ultimatum', tier:1, category:'Leader', power_grade:'S',
         effect_text:'Opponent pays 100 chips OR sacrifices a Unit.',
         trigger:'manual', anti_synergies:['High Stakes'] },
    2: { keyword:'Ultimatum', tier:2, category:'Leader', power_grade:'S',
         effect_text:'Opponent locks 1 Seat next hand OR plays with Hole Cards face-up.',
         trigger:'manual', anti_synergies:['High Stakes'] },
    3: { keyword:'Ultimatum', tier:3, category:'Leader', power_grade:'S',
         effect_text:'Opponent surrenders 50% of Stash OR permanently locks two Seats.',
         trigger:'manual', anti_synergies:['High Stakes'] }
  },
  Martyr: {
    1: { keyword:'Martyr', tier:1, category:'Leader', power_grade:'S',
         effect_text:'Look at Flop cards before betting. Pay 50 chips per hand or your Leader dies.',
         trigger:'preflop', anti_synergies:['All-In'] }
  },
  Desperado: {
    1: { keyword:'Desperado', tier:1, category:'Leader', power_grade:'C',
         effect_text:'You may declare a Fold after the Showdown cards are revealed.',
         trigger:'showdown', anti_synergies:['Jackpot'] }
  },
  Prophet: {
    1: { keyword:'Prophet', tier:1, category:'Leader', power_grade:'B',
         effect_text:'At any time, you may look at the top 2 cards of the Poker Deck.',
         trigger:'manual', anti_synergies:['Blind-River'] }
  },

  // -------------------- LOCATION --------------------
  Restriction: {
    1: { keyword:'Restriction', tier:1, category:'Location', power_grade:'C',
         effect_text:'Flushes are disabled.', trigger:'continuous', anti_synergies:['Suit-Shift'] },
    2: { keyword:'Restriction', tier:2, category:'Location', power_grade:'C',
         effect_text:'Straights and Flushes are disabled. Three-of-a-Kind is the highest hand.',
         trigger:'continuous', anti_synergies:['Suit-Shift'] }
  },
  'Suit-Shift': {
    1: { keyword:'Suit-Shift', tier:1, category:'Location', power_grade:'B',
         effect_text:'Spades and Clubs are considered the same suit.',
         trigger:'continuous', anti_synergies:['Sleight'] },
    2: { keyword:'Suit-Shift', tier:2, category:'Location', power_grade:'B',
         effect_text:'All Red cards (Hearts/Diamonds) are considered the same suit.',
         trigger:'continuous', anti_synergies:['Sleight'] }
  },
  'Blind-River': {
    1: { keyword:'Blind-River', tier:1, category:'Location', power_grade:'B',
         effect_text:'The Turn card is dealt face-down and revealed at Showdown.',
         trigger:'turn', anti_synergies:['Rigged'] },
    2: { keyword:'Blind-River', tier:2, category:'Location', power_grade:'B',
         effect_text:'The River card is dealt face-down and revealed at Showdown.',
         trigger:'river', anti_synergies:['Rigged'] }
  },
  Sanctuary: {
    1: { keyword:'Sanctuary', tier:1, category:'Location', power_grade:'B',
         effect_text:'Players cannot execute Assassinations during the Pre-Flop.',
         trigger:'continuous', anti_synergies:['Blood Feud','Enforcer'] },
    2: { keyword:'Sanctuary', tier:2, category:'Location', power_grade:'B',
         effect_text:'Assassinations are completely disabled for the entire hand.',
         trigger:'continuous', anti_synergies:['Blood Feud','Enforcer'] }
  },
  'Black Market': {
    1: { keyword:'Black Market', tier:1, category:'Location', power_grade:'A',
         effect_text:'Players may sell TCG cards to the Bank for 10 chips each.',
         trigger:'manual', anti_synergies:['Bad Beat'] },
    2: { keyword:'Black Market', tier:2, category:'Location', power_grade:'A',
         effect_text:'Players may sell TCG cards to the Bank for 25 chips each.',
         trigger:'manual', anti_synergies:['Bad Beat'] }
  },
  'High Stakes': {
    1: { keyword:'High Stakes', tier:1, category:'Location', power_grade:'A',
         effect_text:'Blinds are doubled.', trigger:'continuous', anti_synergies:['Grifter'] },
    2: { keyword:'High Stakes', tier:2, category:'Location', power_grade:'A',
         effect_text:'Blinds and Pot Limits are doubled.',
         trigger:'continuous', anti_synergies:['Grifter'] },
    3: { keyword:'High Stakes', tier:3, category:'Location', power_grade:'A',
         effect_text:'Blinds, Pot Limits, and Cast Costs are doubled.',
         trigger:'continuous', anti_synergies:['Grifter'] }
  },
  Jackpot: {
    1: { keyword:'Jackpot', tier:1, category:'Location', power_grade:'B',
         effect_text:'On Showdown win, gain 50 chips.', trigger:'showdown', anti_synergies:['All-In'] },
    2: { keyword:'Jackpot', tier:2, category:'Location', power_grade:'B',
         effect_text:'On Showdown win, deal 50 Damage.', trigger:'showdown', anti_synergies:['All-In'] },
    3: { keyword:'Jackpot', tier:3, category:'Location', power_grade:'B',
         effect_text:'On Showdown win, Ignite Leader for free.', trigger:'showdown', anti_synergies:['All-In'] }
  },
  'Bad Beat': {
    1: { keyword:'Bad Beat', tier:1, category:'Location', power_grade:'B',
         effect_text:'On Showdown loss, refund Ante.', trigger:'showdown', anti_synergies:['All-In'] },
    2: { keyword:'Bad Beat', tier:2, category:'Location', power_grade:'B',
         effect_text:'On Showdown loss, draw 1.', trigger:'showdown', anti_synergies:['All-In'] },
    3: { keyword:'Bad Beat', tier:3, category:'Location', power_grade:'B',
         effect_text:'On Showdown loss, refund full pot contribution.',
         trigger:'showdown', anti_synergies:['All-In'] }
  },
  'Blood Feud': {
    1: { keyword:'Blood Feud', tier:1, category:'Location', power_grade:'C',
         effect_text:'Assassinations reward 25 chips from the Bank.',
         trigger:'on_assassinate', anti_synergies:['Ghost','Undercover'] },
    2: { keyword:'Blood Feud', tier:2, category:'Location', power_grade:'C',
         effect_text:'Successful Assassinations allow you to look at the opponent\'s drawn replacement card.',
         trigger:'on_assassinate', anti_synergies:['Ghost','Undercover'] },
    3: { keyword:'Blood Feud', tier:3, category:'Location', power_grade:'C',
         effect_text:'The Showdown winner randomly steals 1 TCG card from the loser\'s hand.',
         trigger:'showdown', anti_synergies:['Ghost','Undercover'] }
  },
  Wildcard: {
    1: { keyword:'Wildcard', tier:1, category:'Location', power_grade:'S',
         effect_text:'All 2s in the Poker Deck are considered Wild.',
         trigger:'continuous', anti_synergies:['Restriction'] },
    2: { keyword:'Wildcard', tier:2, category:'Location', power_grade:'S',
         effect_text:'All Face Cards belonging to the Spade suit are considered Wild.',
         trigger:'continuous', anti_synergies:['Restriction'] }
  },
  "Dead Man's Switch": {
    1: { keyword:"Dead Man's Switch", tier:1, category:'Location', power_grade:'C',
         effect_text:'If a player Folds, they execute 1 free Assassination before their Seat locks.',
         trigger:'on_fold', anti_synergies:['High Roller'] },
    2: { keyword:"Dead Man's Switch", tier:2, category:'Location', power_grade:'C',
         effect_text:'If a player is reduced to 0 chips, they instantly destroy the highest Defense Unit on the board.',
         trigger:'continuous', anti_synergies:['High Roller'] }
  },
  Standoff: {
    1: { keyword:'Standoff', tier:1, category:'Location', power_grade:'C',
         effect_text:'Poker Pots are never Split. Identical hands → most-chips-in-Stash wins.',
         trigger:'showdown', anti_synergies:['Jackpot'] }
  },

  // -------------------- UNIT --------------------
  Dealer: {
    1: { keyword:'Dealer', tier:1, category:'Unit', power_grade:'B',
         effect_text:'Pay 30 chips to reroll the Turn card once per hand.',
         trigger:'manual', anti_synergies:['Restriction'] },
    2: { keyword:'Dealer', tier:2, category:'Unit', power_grade:'B',
         effect_text:'Face cards (J, Q, K) are equal to 10 for hand-ranking purposes.',
         trigger:'continuous', anti_synergies:['Restriction'] }
  },
  Bouncer: {
    1: { keyword:'Bouncer', tier:1, category:'Unit', power_grade:'B',
         effect_text:'Opponents pay 25 chips to target this Unit.',
         trigger:'on_target', anti_synergies:['Enforcer'] },
    2: { keyword:'Bouncer', tier:2, category:'Unit', power_grade:'B',
         effect_text:'Opponents must discard an additional TCG card to Assassinate this Unit.',
         trigger:'on_target', anti_synergies:['Enforcer'] }
  },
  Tell: {
    1: { keyword:'Tell', tier:1, category:'Unit', power_grade:'B',
         effect_text:'When opponent Raises, gain 15 chips.',
         trigger:'on_opponent_raise', anti_synergies:['Parry'] },
    2: { keyword:'Tell', tier:2, category:'Unit', power_grade:'B',
         effect_text:'When opponent Checks, peek at a random card in their TCG hand.',
         trigger:'on_opponent_check', anti_synergies:['Parry'] }
  },
  Grifter: {
    1: { keyword:'Grifter', tier:1, category:'Unit', power_grade:'A',
         effect_text:'On enter: steal 15 chips from the Pot.', trigger:'on_enter', anti_synergies:['Reckless'] },
    2: { keyword:'Grifter', tier:2, category:'Unit', power_grade:'A',
         effect_text:'On enter: steal 30 chips from opponent\'s Stash.',
         trigger:'on_enter', anti_synergies:['Reckless'] },
    3: { keyword:'Grifter', tier:3, category:'Unit', power_grade:'A',
         effect_text:'On enter: steal 50 chips from opponent\'s Stash and draw 1 TCG card.',
         trigger:'on_enter', anti_synergies:['Reckless'] }
  },
  Enforcer: {
    1: { keyword:'Enforcer', tier:1, category:'Unit', power_grade:'B',
         effect_text:'Opponents must Assassinate this Unit before targeting your other Units.',
         trigger:'continuous', anti_synergies:['Ghost'] },
    2: { keyword:'Enforcer', tier:2, category:'Unit', power_grade:'B',
         effect_text:'Opponents cannot play Events that target your Leader until this is dead.',
         trigger:'continuous', anti_synergies:['Ghost'] },
    3: { keyword:'Enforcer', tier:3, category:'Unit', power_grade:'B',
         effect_text:'Opponents cannot play Events that target your Casino Floor until this is dead.',
         trigger:'continuous', anti_synergies:['Ghost'] }
  },
  Undercover: {
    1: { keyword:'Undercover', tier:1, category:'Unit', power_grade:'C',
         effect_text:'Pay 10 chips to flip; when flipped, deal 20 damage to opponent\'s Stash.',
         trigger:'manual', anti_synergies:['Soulbound'] },
    2: { keyword:'Undercover', tier:2, category:'Unit', power_grade:'C',
         effect_text:'Flips automatically when targeted, completely negating that Assassination attempt.',
         trigger:'on_target', anti_synergies:['Soulbound'] },
    3: { keyword:'Undercover', tier:3, category:'Unit', power_grade:'C',
         effect_text:'Flips automatically at Showdown, upgrading your Poker Hand ranking by exactly one tier.',
         trigger:'showdown', anti_synergies:['Soulbound'] }
  },
  'High Roller': {
    1: { keyword:'High Roller', tier:1, category:'Unit', power_grade:'B',
         effect_text:'While you have more chips, this Unit gains +2 Defense.',
         trigger:'continuous', anti_synergies:['Martyr'] },
    2: { keyword:'High Roller', tier:2, category:'Unit', power_grade:'B',
         effect_text:'While you have more chips, your Pre-Flop Casts cost 0 chips.',
         trigger:'preflop', anti_synergies:['Martyr'] },
    3: { keyword:'High Roller', tier:3, category:'Unit', power_grade:'B',
         effect_text:'While you have more chips, this Unit cannot be Assassinated.',
         trigger:'continuous', anti_synergies:['Martyr'] }
  },
  Reckless: {
    1: { keyword:'Reckless', tier:1, category:'Unit', power_grade:'S',
         effect_text:'12 Defense. Drawback: You must play with 1 Hole Card face-up.',
         trigger:'continuous', anti_synergies:['Faustian'] },
    2: { keyword:'Reckless', tier:2, category:'Unit', power_grade:'S',
         effect_text:'14 Defense, unkillable. Drawback: One of your other Seats is permanently Locked.',
         trigger:'continuous', anti_synergies:['Faustian'] },
    3: { keyword:'Reckless', tier:3, category:'Unit', power_grade:'S',
         effect_text:'Whenever you Cast an Event, copy it for free. Drawback: You cannot Bet or Raise (only Check or Call).',
         trigger:'continuous', anti_synergies:['Faustian'] }
  },
  Mercenary: {
    1: { keyword:'Mercenary', tier:1, category:'Unit', power_grade:'C',
         effect_text:'If opponent\'s Stash is double yours, this Unit switches to their board.',
         trigger:'continuous', anti_synergies:['All-In'] },
    2: { keyword:'Mercenary', tier:2, category:'Unit', power_grade:'C',
         effect_text:'At Pre-Flop, the player who Antes the most extra chips gains control of this Unit for the hand.',
         trigger:'preflop', anti_synergies:['All-In'] }
  },
  Sniper: {
    1: { keyword:'Sniper', tier:1, category:'Unit', power_grade:'A',
         effect_text:'You may Assassinate using Face-Up Hole cards.',
         trigger:'continuous', anti_synergies:['Wiretap'] },
    2: { keyword:'Sniper', tier:2, category:'Unit', power_grade:'A',
         effect_text:'You may discard 2 Hole Cards whose combined value equals the target\'s Defense to Assassinate.',
         trigger:'continuous', anti_synergies:['Wiretap'] }
  },
  Ghost: {
    1: { keyword:'Ghost', tier:1, category:'Unit', power_grade:'B',
         effect_text:'This Unit cannot be Targeted by Events.',
         trigger:'continuous', anti_synergies:['Soulbound'] },
    2: { keyword:'Ghost', tier:2, category:'Unit', power_grade:'B',
         effect_text:'Immune to Assassination.', trigger:'continuous', anti_synergies:['Soulbound'] }
  },
  Bodyguard: {
    1: { keyword:'Bodyguard', tier:1, category:'Unit', power_grade:'B',
         effect_text:'Friendly Units in adjacent Seats cannot be Targeted by Events.',
         trigger:'continuous', anti_synergies:['Ghost'] },
    2: { keyword:'Bodyguard', tier:2, category:'Unit', power_grade:'B',
         effect_text:'You may redirect an Assassination targeting an adjacent friendly Unit to this Unit instead.',
         trigger:'on_target', anti_synergies:['Ghost'] }
  },
  Syndicate: {
    1: { keyword:'Syndicate', tier:1, category:'Unit', power_grade:'A',
         effect_text:'Gains +1 Defense for each other Syndicate Unit you control.',
         trigger:'continuous', anti_synergies:['Reckless'] },
    2: { keyword:'Syndicate', tier:2, category:'Unit', power_grade:'A',
         effect_text:'When you place this Unit, draw 1 TCG card if you control another Syndicate Unit.',
         trigger:'on_enter', anti_synergies:['Reckless'] }
  },
  Mascot: {
    1: { keyword:'Mascot', tier:1, category:'Unit', power_grade:'C',
         effect_text:'Gains +1 Defense for each face-card on the Community board.',
         trigger:'continuous', anti_synergies:['Restriction'] },
    2: { keyword:'Mascot', tier:2, category:'Unit', power_grade:'C',
         effect_text:'If you win the Showdown with exactly Two-Pair, this Unit generates 50 chips.',
         trigger:'showdown', anti_synergies:['Restriction'] }
  },
  Nomad: {
    1: { keyword:'Nomad', tier:1, category:'Unit', power_grade:'C',
         effect_text:'Pay 10 chips: Move this Unit to an adjacent empty Seat.',
         trigger:'manual', anti_synergies:['Syndicate'] },
    2: { keyword:'Nomad', tier:2, category:'Unit', power_grade:'C',
         effect_text:'When this Unit moves to a new Seat, gain 15 chips.',
         trigger:'manual', anti_synergies:['Syndicate'] }
  },
  Extort: {
    1: { keyword:'Extort', tier:1, category:'Unit', power_grade:'B',
         effect_text:'Opponent\'s Events cost 10 additional chips to Cast.',
         trigger:'continuous', anti_synergies:['High Roller'] },
    2: { keyword:'Extort', tier:2, category:'Unit', power_grade:'B',
         effect_text:'Opponents must pay 10 chips to the Bank to declare a Check during betting phases.',
         trigger:'on_betting', anti_synergies:['High Roller'] }
  },

  // -------------------- EVENT --------------------
  Sleight: {
    1: { keyword:'Sleight', tier:1, category:'Event', power_grade:'B',
         effect_text:'Swap a Hole Card with a random card from the Muck.',
         trigger:'on_cast', anti_synergies:[] },
    2: { keyword:'Sleight', tier:2, category:'Event', power_grade:'B',
         effect_text:'Change the suit of one Community Card to a suit of your choice until the end of the hand.',
         trigger:'on_cast', anti_synergies:[] }
  },
  'Fold-Cast': {
    1: { keyword:'Fold-Cast', tier:1, category:'Event', power_grade:'B',
         effect_text:'Fold-Cast this to avoid the Seat Lock or Exhaustion penalty for this hand.',
         trigger:'on_cast', anti_synergies:['Kickback'] },
    2: { keyword:'Fold-Cast', tier:2, category:'Event', power_grade:'B',
         effect_text:'Fold-Cast this to deal chip damage equal to half the current Pot.',
         trigger:'on_cast', anti_synergies:['Kickback'] }
  },
  Parry: {
    1: { keyword:'Parry', tier:1, category:'Event', power_grade:'A',
         effect_text:'Cap the opponent\'s current Raise to exactly half the pot size.',
         trigger:'on_opponent_raise', anti_synergies:['Phantom'] },
    2: { keyword:'Parry', tier:2, category:'Event', power_grade:'A',
         effect_text:'Cap the opponent\'s current Raise to the exact size of the Big Blind.',
         trigger:'on_opponent_raise', anti_synergies:['Phantom'] },
    3: { keyword:'Parry', tier:3, category:'Event', power_grade:'A',
         effect_text:'Cancel the Raise entirely; opponent must Call the previous bet or Fold.',
         trigger:'on_opponent_raise', anti_synergies:['Phantom'] }
  },
  Wiretap: {
    1: { keyword:'Wiretap', tier:1, category:'Event', power_grade:'A',
         effect_text:'Look at 1 opponent Hole Card.', trigger:'on_cast', anti_synergies:['Undercover'] },
    2: { keyword:'Wiretap', tier:2, category:'Event', power_grade:'A',
         effect_text:'Look at opponent\'s entire TCG hand.', trigger:'on_cast', anti_synergies:['Undercover'] },
    3: { keyword:'Wiretap', tier:3, category:'Event', power_grade:'A',
         effect_text:'Look at 1 opponent Hole Card and permanently flip it face-up.',
         trigger:'on_cast', anti_synergies:['Undercover'] }
  },
  Kickback: {
    1: { keyword:'Kickback', tier:1, category:'Event', power_grade:'B',
         effect_text:'Refund 50% of the cast cost to your Stash.',
         trigger:'on_cast', anti_synergies:[] },
    2: { keyword:'Kickback', tier:2, category:'Event', power_grade:'B',
         effect_text:'Refund 100% of the cast cost.', trigger:'on_cast', anti_synergies:[] },
    3: { keyword:'Kickback', tier:3, category:'Event', power_grade:'B',
         effect_text:'Refund 100% of the cast cost and draw 1 TCG card.',
         trigger:'on_cast', anti_synergies:[] }
  },
  'All-In': {
    1: { keyword:'All-In', tier:1, category:'Event', power_grade:'S',
         effect_text:'Destroy target Unit, ignoring Defense stats and Enforcer rules.',
         trigger:'on_cast', anti_synergies:['Mercenary','High Roller'] },
    2: { keyword:'All-In', tier:2, category:'Event', power_grade:'S',
         effect_text:'Draw 3 TCG cards and play them for free.',
         trigger:'on_cast', anti_synergies:['Mercenary','High Roller'] },
    3: { keyword:'All-In', tier:3, category:'Event', power_grade:'S',
         effect_text:'Instantly Ignite your Leader.',
         trigger:'on_cast', anti_synergies:['Mercenary','High Roller'] }
  },
  Faustian: {
    1: { keyword:'Faustian', tier:1, category:'Event', power_grade:'S',
         effect_text:'Search deck for 2 cards. Drawback: 1 permanent Fatigue token.',
         trigger:'on_cast', anti_synergies:['Fold-Cast'] },
    2: { keyword:'Faustian', tier:2, category:'Event', power_grade:'S',
         effect_text:'Play a Unit for free. Drawback: Max Hand Size permanently reduced by 1.',
         trigger:'on_cast', anti_synergies:['Fold-Cast'] },
    3: { keyword:'Faustian', tier:3, category:'Event', power_grade:'S',
         effect_text:'Steal an enemy Unit. Drawback: Must match all opponent bets (Cannot Fold).',
         trigger:'on_cast', anti_synergies:['Fold-Cast'] }
  },
  Counterfeit: {
    1: { keyword:'Counterfeit', tier:1, category:'Event', power_grade:'C',
         effect_text:'Create a temporary copy of an Artifact (destroyed at end of hand).',
         trigger:'on_cast', anti_synergies:['Pawn'] },
    2: { keyword:'Counterfeit', tier:2, category:'Event', power_grade:'C',
         effect_text:'Create a temporary copy of a Unit in an empty Seat (destroyed at end of hand).',
         trigger:'on_cast', anti_synergies:['Pawn'] }
  },
  Bribe: {
    1: { keyword:'Bribe', tier:1, category:'Event', power_grade:'B',
         effect_text:'Pay opponent 25 chips to counter their Event.',
         trigger:'on_opponent_event', anti_synergies:['High Roller'] },
    2: { keyword:'Bribe', tier:2, category:'Event', power_grade:'B',
         effect_text:'Pay opponent 50 chips to counter their Event and draw 1 card.',
         trigger:'on_opponent_event', anti_synergies:['High Roller'] }
  },
  Audit: {
    1: { keyword:'Audit', tier:1, category:'Event', power_grade:'S',
         effect_text:'Look at opponent\'s TCG deck; exile 1 card of your choice from it.',
         trigger:'on_cast', anti_synergies:['Blood Feud'] },
    2: { keyword:'Audit', tier:2, category:'Event', power_grade:'S',
         effect_text:'Name a card; opponent must exile all copies from their deck and TCG hand.',
         trigger:'on_cast', anti_synergies:['Blood Feud'] }
  },
  Launder: {
    1: { keyword:'Launder', tier:1, category:'Event', power_grade:'B',
         effect_text:'Discard a TCG card to gain 30 chips from the Bank.',
         trigger:'on_cast', anti_synergies:['Faustian'] },
    2: { keyword:'Launder', tier:2, category:'Event', power_grade:'B',
         effect_text:'Discard a TCG card to gain chips from the Bank equal to the current Big Blind.',
         trigger:'on_cast', anti_synergies:['Faustian'] }
  },
  Scavenge: {
    1: { keyword:'Scavenge', tier:1, category:'Event', power_grade:'C',
         effect_text:'Exile a card from your Graveyard to draw 1 TCG card.',
         trigger:'on_cast', anti_synergies:[] },
    2: { keyword:'Scavenge', tier:2, category:'Event', power_grade:'C',
         effect_text:'Exile 3 cards from your Graveyard to return 1 target Event to your hand.',
         trigger:'on_cast', anti_synergies:[] }
  },
  Mill: {
    1: { keyword:'Mill', tier:1, category:'Event', power_grade:'B',
         effect_text:'Target opponent discards the top 2 cards of their TCG deck.',
         trigger:'on_cast', anti_synergies:['Scavenge'] },
    2: { keyword:'Mill', tier:2, category:'Event', power_grade:'B',
         effect_text:'Target opponent discards 1 card from their hand at random.',
         trigger:'on_cast', anti_synergies:['Scavenge'] }
  },
  Roulette: {
    1: { keyword:'Roulette', tier:1, category:'Event', power_grade:'C',
         effect_text:'Reveal top of Poker Deck. Red → 30 damage. Black → 30 chips.',
         trigger:'on_cast', anti_synergies:['Restriction'] },
    2: { keyword:'Roulette', tier:2, category:'Event', power_grade:'C',
         effect_text:'Reveal top of Poker Deck. Face Card → draw 2 TCG cards.',
         trigger:'on_cast', anti_synergies:['Restriction'] }
  },

  // -------------------- ARTIFACT --------------------
  Phantom: {
    1: { keyword:'Phantom', tier:1, category:'Artifact', power_grade:'B',
         effect_text:'Add 100 "Phantom Chips" to the pot.',
         trigger:'on_cast', anti_synergies:['Parry'] },
    2: { keyword:'Phantom', tier:2, category:'Artifact', power_grade:'B',
         effect_text:'Add 200 "Phantom Chips" to the pot.',
         trigger:'on_cast', anti_synergies:['Parry'] }
  },
  Rigged: {
    1: { keyword:'Rigged', tier:1, category:'Artifact', power_grade:'B',
         effect_text:'Equip to Flop. That card belongs only to you; opponent cannot use it.',
         trigger:'on_cast', anti_synergies:['Blind-River'] },
    2: { keyword:'Rigged', tier:2, category:'Artifact', power_grade:'B',
         effect_text:'Equip to River. That card is considered a Wild Card for all players.',
         trigger:'on_cast', anti_synergies:['Blind-River'] }
  },
  Pawn: {
    1: { keyword:'Pawn', tier:1, category:'Artifact', power_grade:'B',
         effect_text:'Destroy this to gain 25 Chips.', trigger:'manual', anti_synergies:['Counterfeit'] },
    2: { keyword:'Pawn', tier:2, category:'Artifact', power_grade:'B',
         effect_text:'Destroy this to gain 50 Chips.', trigger:'manual', anti_synergies:['Counterfeit'] },
    3: { keyword:'Pawn', tier:3, category:'Artifact', power_grade:'B',
         effect_text:'Destroy this to gain Chips equal to half the current Pot.',
         trigger:'manual', anti_synergies:['Counterfeit'] }
  },
  Cursed: {
    1: { keyword:'Cursed', tier:1, category:'Artifact', power_grade:'A',
         effect_text:'Equip to enemy Unit. -2 Defense.', trigger:'continuous', anti_synergies:['Sabotage'] },
    2: { keyword:'Cursed', tier:2, category:'Artifact', power_grade:'A',
         effect_text:'Equip to enemy Unit. It loses all Keyword abilities.',
         trigger:'continuous', anti_synergies:['Sabotage'] },
    3: { keyword:'Cursed', tier:3, category:'Artifact', power_grade:'A',
         effect_text:'Equip to empty enemy Seat. That Seat is permanently Locked until they Fold.',
         trigger:'continuous', anti_synergies:['Sabotage'] }
  },
  Concealed: {
    1: { keyword:'Concealed', tier:1, category:'Artifact', power_grade:'B',
         effect_text:'Flips when opponent Casts a Unit, dealing 10 chip damage.',
         trigger:'on_cast', anti_synergies:['Undercover'] },
    2: { keyword:'Concealed', tier:2, category:'Artifact', power_grade:'B',
         effect_text:'Flips when your Unit is targeted, negating the hit.',
         trigger:'on_target', anti_synergies:['Undercover'] },
    3: { keyword:'Concealed', tier:3, category:'Artifact', power_grade:'B',
         effect_text:'Flips when opponent Bets, automatically matching their bet using Phantom chips.',
         trigger:'on_betting', anti_synergies:['Undercover'] }
  },
  Soulbound: {
    1: { keyword:'Soulbound', tier:1, category:'Artifact', power_grade:'C',
         effect_text:'Equipped Unit gains +2 Def. Liability: If Assassinated, lose 50 chips.',
         trigger:'continuous', anti_synergies:['Ghost','Enforcer'] },
    2: { keyword:'Soulbound', tier:2, category:'Artifact', power_grade:'C',
         effect_text:'Equipped Unit immune to Events. Liability: If Assassinated, discard TCG hand.',
         trigger:'continuous', anti_synergies:['Ghost','Enforcer'] },
    3: { keyword:'Soulbound', tier:3, category:'Artifact', power_grade:'C',
         effect_text:'Equipped Unit Defense becomes 14. Liability: If Assassinated, forfeit the Pot.',
         trigger:'continuous', anti_synergies:['Ghost','Enforcer'] }
  },
  Vault: {
    1: { keyword:'Vault', tier:1, category:'Artifact', power_grade:'B',
         effect_text:'Place 10% of Pot winnings here. Protected from Grifters.',
         trigger:'showdown', anti_synergies:['All-In'] },
    2: { keyword:'Vault', tier:2, category:'Artifact', power_grade:'B',
         effect_text:'Place 20% of Pot winnings here. Protected from Grifters.',
         trigger:'showdown', anti_synergies:['All-In'] }
  },
  Sabotage: {
    1: { keyword:'Sabotage', tier:1, category:'Artifact', power_grade:'A',
         effect_text:'Enemy Unit in this Seat costs 10 additional chips to Cast.',
         trigger:'continuous', anti_synergies:['Cursed'] },
    2: { keyword:'Sabotage', tier:2, category:'Artifact', power_grade:'A',
         effect_text:'Enemy Unit in this Seat costs 20 additional chips to Cast.',
         trigger:'continuous', anti_synergies:['Cursed'] }
  },
  Contraband: {
    1: { keyword:'Contraband', tier:1, category:'Artifact', power_grade:'A',
         effect_text:'Equipped Unit gains Ghost I.', trigger:'continuous', anti_synergies:['Cursed'] },
    2: { keyword:'Contraband', tier:2, category:'Artifact', power_grade:'A',
         effect_text:'Equipped Unit gains Sniper I.', trigger:'continuous', anti_synergies:['Cursed'] }
  },
  Shrapnel: {
    1: { keyword:'Shrapnel', tier:1, category:'Artifact', power_grade:'C',
         effect_text:'If destroyed, deal 15 chip damage to the opponent.',
         trigger:'on_destroy', anti_synergies:['Soulbound'] },
    2: { keyword:'Shrapnel', tier:2, category:'Artifact', power_grade:'C',
         effect_text:'If destroyed, randomly discard 1 of the opponent\'s Hole Cards.',
         trigger:'on_destroy', anti_synergies:['Soulbound'] }
  },
  Smuggle: {
    1: { keyword:'Smuggle', tier:1, category:'Artifact', power_grade:'B',
         effect_text:'Maximum TCG Hand Size +1 during the Cleanup Phase.',
         trigger:'cleanup', anti_synergies:['Launder'] },
    2: { keyword:'Smuggle', tier:2, category:'Artifact', power_grade:'B',
         effect_text:'You may hold 3 Hole Cards instead of 2.',
         trigger:'continuous', anti_synergies:['Launder'] }
  }
};

// Quick lookup utility
export function getKeyword(k: Keyword | undefined, tier: Tier | undefined): KeywordTierDef | undefined {
  if (!k || !tier) return undefined;
  return KEYWORDS[k]?.[tier];
}
