import Svg, { Circle, Path } from "react-native-svg"
import { colors } from "@game/theme"

/* Original neutral mark: a sealed dossier compass. No faction imagery. */
export function BrandSeal({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" accessibilityLabel="Game seal">
      <Circle cx="40" cy="40" r="37" fill={colors.surfaceRecessed} stroke={colors.accent} strokeWidth="1.5" />
      <Circle cx="40" cy="40" r="31" fill="none" stroke={colors.border} strokeWidth="1" />
      <Circle cx="40" cy="40" r="24" fill="none" stroke={colors.accent} strokeWidth="0.7" />
      <Path d="M40 14 L44 36 L66 40 L44 44 L40 66 L36 44 L14 40 L36 36 Z" fill={colors.accent} />
      <Circle cx="40" cy="40" r="5" fill={colors.ink} stroke={colors.paper} strokeWidth="1" />
    </Svg>
  )
}
