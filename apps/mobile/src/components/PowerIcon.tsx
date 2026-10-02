/* Simple abstract glyphs for the four powers (spec Sec 7.5: empty
   Fascist board slots show their power icon). Deliberately plain
   shapes, not pictograms of anything real - avoids any resemblance
   to the games original wartime iconography. */
import { Circle, Line, Path, Svg } from "react-native-svg"
import { colors } from "@game/theme"
import type { PowerToken } from "@game/theme"

export interface PowerIconProps {
  power: PowerToken
  size?: number
  color?: string
}

export function PowerIcon({ power, size = 24, color = colors.accent }: PowerIconProps) {
  if (power === "POWER_INVESTIGATE") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={10} cy={10} r={6} stroke={color} strokeWidth={2} fill="none" />
        <Line x1={15} y1={15} x2={20} y2={20} stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    )
  }
  if (power === "POWER_SPECIAL_ELECTION") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} fill="none" />
        <Path d="M12 7 L17 13 L13 13 L13 17 L11 17 L11 13 L7 13 Z" fill={color} />
      </Svg>
    )
  }
  if (power === "POWER_POLICY_PEEK") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M2 12 C5 6, 19 6, 22 12 C19 18, 5 18, 2 12 Z" stroke={color} strokeWidth={2} fill="none" />
        <Circle cx={12} cy={12} r={3} fill={color} />
      </Svg>
    )
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={5} y1={5} x2={19} y2={19} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Line x1={19} y1={5} x2={5} y2={19} stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}
