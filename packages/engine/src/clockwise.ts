/* Shared clockwise-walk helper. Not a rule itself - R11 (rotation) and the
   Sec 6 reveal-duty transfer both need "find the next player after X who
   satisfies some condition, wrapping around the table, skipping X itself".
   Covered by the tests of its callers (rotation.test.ts, voting.test.ts). */
export function findNextClockwise<T>(
  seatOrder: readonly T[],
  from: T,
  isEligible: (candidate: T) => boolean,
): T | null {
  const total = seatOrder.length
  const startIndex = seatOrder.indexOf(from)
  if (startIndex === -1) {
    throw new Error("findNextClockwise: the given player is not in the seat order")
  }
  let steps = 1
  while (steps <= total) {
    const candidate = seatOrder[(startIndex + steps) % total] as T
    if (isEligible(candidate)) {
      return candidate
    }
    steps += 1
  }
  return null
}
