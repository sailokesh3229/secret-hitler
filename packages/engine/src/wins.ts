/* R43-R48: win checks, driven by the board tables (never hard-code "5
   Liberal" or "6 Fascist" - read the winning slot from the same R5 table
   boards.ts already builds). R47 ordering: a winning tile triggers no
   power - callers must check these BEFORE looking up a power for the
   same enactment. R44/R46 win immediately outside the normal enactment
   flow (execution, election). R48 (auto-reveal Hitler) is projectView\x27s
   job once phase is GAME_OVER, not this module\x27s. */
import { ROLE_LEADER } from "./types.js"
import { getFascistBoardSlots, getLiberalBoardSlots } from "./boards.js"
import type { FascistBoardSlot, LiberalBoardSlot } from "./boards.js"
import type { PlayerCount, Role } from "./types.js"

function getWinningSlotNumber(slots: readonly (FascistBoardSlot | LiberalBoardSlot)[]): number {
  const winningSlot = slots.find((s) => s.winsGame)
  if (winningSlot === undefined) {
    throw new Error("Board has no winning slot - this is a data bug, not a game state")
  }
  return winningSlot.slot
}

/* R43: 5 Liberal policies win. */
export function checkLiberalPoliciesWin(liberalPoliciesEnacted: number): boolean {
  return liberalPoliciesEnacted >= getWinningSlotNumber(getLiberalBoardSlots())
}

/* R45: 6 Fascist policies win (the boards winning slot, per player count). */
export function checkFascistPoliciesWin(fascistPoliciesEnacted: number, playerCount: PlayerCount): boolean {
  return fascistPoliciesEnacted >= getWinningSlotNumber(getFascistBoardSlots(playerCount))
}

/* R44: executing Hitler wins immediately for the Liberals. */
export function checkHitlerExecutedWin(executedRole: Role): boolean {
  return executedRole === ROLE_LEADER
}

export const WIN_REASON_LIBERAL_POLICIES = "WIN_REASON_LIBERAL_POLICIES"
export const WIN_REASON_HITLER_EXECUTED = "WIN_REASON_HITLER_EXECUTED"
export const WIN_REASON_FASCIST_POLICIES = "WIN_REASON_FASCIST_POLICIES"
export const WIN_REASON_HITLER_CHANCELLOR = "WIN_REASON_HITLER_CHANCELLOR"
export type WinReason =
  | typeof WIN_REASON_LIBERAL_POLICIES
  | typeof WIN_REASON_HITLER_EXECUTED
  | typeof WIN_REASON_FASCIST_POLICIES
  | typeof WIN_REASON_HITLER_CHANCELLOR
