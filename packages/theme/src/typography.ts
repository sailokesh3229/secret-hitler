/* spec Sec 9: interface font Jost, document font (role card, dossier,
   log) Libre Caslon Text. apps/mobile loads the actual font files
   (Google Fonts) and registers these family names with expo-font.

   Android ignores the fontWeight style prop entirely for a custom
   (non-system) font - a bold-looking label needs its OWN registered
   family, not fontFamily.interface + fontWeight: "700". iOS tolerates
   synthetic bold, Android does not, so every weight actually used in
   the app gets its own token here rather than relying on fontWeight
   alone. */
export const fontFamily = {
  interface: "Jost",
  interfaceSemiBold: "Jost-SemiBold",
  interfaceBold: "Jost-Bold",
  document: "Libre Caslon Text",
  documentBold: "Libre Caslon Text-Bold",
} as const

export const fontSize = {
  micro: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  heroMobile: 42,
  heroDesktop: 64,
} as const

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const
