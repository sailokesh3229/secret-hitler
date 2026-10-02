/* R21: a failed vote moves the tracker +1. R22: reaching 3 triggers Chaos.
   R24: the tracker resets to 0 whenever any policy is enacted, by a
   government or by Chaos. */
export const CHAOS_TRACKER_THRESHOLD = 3

export function incrementElectionTracker(tracker: number): number {
  return tracker + 1
}

export function resetElectionTracker(): number {
  return 0
}

export function hasReachedChaos(tracker: number): boolean {
  return tracker >= CHAOS_TRACKER_THRESHOLD
}
