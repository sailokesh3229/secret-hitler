/* Maps the theme haptic identifiers (spec Sec 9) to expo-haptics. Same call for every role and every private result (CLAUDE.md rule 7). */
import * as Haptics from "expo-haptics"
import { HAPTIC_ENACTMENT, HAPTIC_SELECTION, type HapticStyle } from "@game/theme"

export function playHaptic(style: HapticStyle): void {
  if (style === HAPTIC_SELECTION) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    return
  }
  if (style === HAPTIC_ENACTMENT) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }
}
