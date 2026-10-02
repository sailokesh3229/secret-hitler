/* spec Sec 9: interface font Jost, document font (role card, dossier,
   log) Libre Caslon Text. apps/mobile loads the actual font files
   (Google Fonts) and registers these family names with expo-font. */
export const fontFamily = {
  interface: "Jost",
  document: "Libre Caslon Text",
} as const

export const fontSize = {
  micro: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const
