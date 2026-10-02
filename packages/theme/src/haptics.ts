/* spec Sec 9: light on selection, one firm impact on enactment. These
   are style identifiers, not Expo Haptics calls - packages/theme has
   no React Native/Expo dependency, so apps/mobile maps each one to
   the real expo-haptics API. CLAUDE.md rule 7: identical for every
   role, every private result - never role-specific. */
export const HAPTIC_SELECTION = "HAPTIC_SELECTION"
export const HAPTIC_ENACTMENT = "HAPTIC_ENACTMENT"
export type HapticStyle = typeof HAPTIC_SELECTION | typeof HAPTIC_ENACTMENT
