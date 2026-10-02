/* spec Sec 9: Liberal = round emblem, Fascist = angular emblem. Spec
   Sec 9 fixed rule: team colour is never the only signal, so every
   place that shows a team colour pairs it with this shape AND the
   word (teamNames/roleNames) - never colour alone. No real Nazi
   symbols (fixed rule): the angular shape is an abstract diamond,
   nothing more. */
import { Circle, Rect, Svg } from "react-native-svg"
import { colors, type TeamToken } from "@game/theme"

export interface EmblemProps {
  team: TeamToken
  size?: number
}

export function Emblem({ team, size = 28 }: EmblemProps) {
  const isLiberal = team === "TEAM_LIBERAL"
  const color = isLiberal ? colors.liberal : colors.fascist
  if (isLiberal) {
    return (
      <Svg width={size} height={size} viewBox="0 0 28 28">
        <Circle cx={14} cy={14} r={12} fill={color} />
        <Circle cx={14} cy={14} r={6} fill={colors.paper} />
      </Svg>
    )
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Rect x={4} y={4} width={20} height={20} fill={color} transform="rotate(45 14 14)" />
      <Rect x={10} y={10} width={8} height={8} fill={colors.paper} transform="rotate(45 14 14)" />
    </Svg>
  )
}
