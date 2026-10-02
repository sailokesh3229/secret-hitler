/* R5: boards are data, read from this config table by player count. Never
   hard-code a slot number to a power anywhere else in the codebase. */
import type { PlayerCount } from "./types.js"

export const POWER_INVESTIGATE = "POWER_INVESTIGATE"
export const POWER_SPECIAL_ELECTION = "POWER_SPECIAL_ELECTION"
export const POWER_POLICY_PEEK = "POWER_POLICY_PEEK"
export const POWER_EXECUTION = "POWER_EXECUTION"
export type Power =
  | typeof POWER_INVESTIGATE
  | typeof POWER_SPECIAL_ELECTION
  | typeof POWER_POLICY_PEEK
  | typeof POWER_EXECUTION

export interface FascistBoardSlot {
  slot: number
  power: Power | null
  unlocksVeto: boolean
  winsGame: boolean
}

const BOARD_5_6: FascistBoardSlot[] = [
  { slot: 1, power: null, unlocksVeto: false, winsGame: false },
  { slot: 2, power: null, unlocksVeto: false, winsGame: false },
  { slot: 3, power: POWER_POLICY_PEEK, unlocksVeto: false, winsGame: false },
  { slot: 4, power: POWER_EXECUTION, unlocksVeto: false, winsGame: false },
  { slot: 5, power: POWER_EXECUTION, unlocksVeto: true, winsGame: false },
  { slot: 6, power: null, unlocksVeto: false, winsGame: true },
]

const BOARD_7_8: FascistBoardSlot[] = [
  { slot: 1, power: null, unlocksVeto: false, winsGame: false },
  { slot: 2, power: POWER_INVESTIGATE, unlocksVeto: false, winsGame: false },
  { slot: 3, power: POWER_SPECIAL_ELECTION, unlocksVeto: false, winsGame: false },
  { slot: 4, power: POWER_EXECUTION, unlocksVeto: false, winsGame: false },
  { slot: 5, power: POWER_EXECUTION, unlocksVeto: true, winsGame: false },
  { slot: 6, power: null, unlocksVeto: false, winsGame: true },
]

const BOARD_9_10: FascistBoardSlot[] = [
  { slot: 1, power: POWER_INVESTIGATE, unlocksVeto: false, winsGame: false },
  { slot: 2, power: POWER_INVESTIGATE, unlocksVeto: false, winsGame: false },
  { slot: 3, power: POWER_SPECIAL_ELECTION, unlocksVeto: false, winsGame: false },
  { slot: 4, power: POWER_EXECUTION, unlocksVeto: false, winsGame: false },
  { slot: 5, power: POWER_EXECUTION, unlocksVeto: true, winsGame: false },
  { slot: 6, power: null, unlocksVeto: false, winsGame: true },
]

export const FASCIST_BOARD_BY_PLAYER_COUNT: Record<PlayerCount, FascistBoardSlot[]> = {
  5: BOARD_5_6,
  6: BOARD_5_6,
  7: BOARD_7_8,
  8: BOARD_7_8,
  9: BOARD_9_10,
  10: BOARD_9_10,
}

export function getFascistBoardSlots(playerCount: PlayerCount): FascistBoardSlot[] {
  return FASCIST_BOARD_BY_PLAYER_COUNT[playerCount]
}

/* Liberal board: 5 slots, no powers. The 5th Liberal policy wins (R43, R5).
   Identical for every player count. */
export interface LiberalBoardSlot {
  slot: number
  winsGame: boolean
}

export const LIBERAL_BOARD: LiberalBoardSlot[] = [
  { slot: 1, winsGame: false },
  { slot: 2, winsGame: false },
  { slot: 3, winsGame: false },
  { slot: 4, winsGame: false },
  { slot: 5, winsGame: true },
]

export function getLiberalBoardSlots(): LiberalBoardSlot[] {
  return LIBERAL_BOARD
}
