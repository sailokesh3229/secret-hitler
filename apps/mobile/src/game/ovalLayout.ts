/* Seat positions around an oval for 5-10 players (spec S11). Seat 0 sits at the top and the rest follow clockwise in seat order, so the table reads the same way on every phone. Pure geometry, no React Native import. */
export interface SeatSpot {
  left: number
  top: number
}

export function ovalSeatSpots(
  count: number,
  width: number,
  height: number,
  seatWidth: number,
  seatHeight: number,
): SeatSpot[] {
  const radiusX = (width - seatWidth) / 2
  const radiusY = (height - seatHeight) / 2
  const centerX = width / 2
  const centerY = height / 2
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count
    return {
      left: centerX + radiusX * Math.cos(angle) - seatWidth / 2,
      top: centerY + radiusY * Math.sin(angle) - seatHeight / 2,
    }
  })
}
