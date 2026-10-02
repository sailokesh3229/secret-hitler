/* spec Sec 9 design brief ("The Card Table" defaults - the "Your choice"
   column is blank, so every value here is the documented default).
   CLAUDE.md rule 6: every colour the app uses lives here, nothing
   hard-coded in apps/mobile. Derived shades (pressed states, borders,
   muted text) are not in the brief itself - noted below each group. */
export const colors = {
  background: "#1E3A2F",
  surfaceRecessed: "#15291F",
  surfaceRaised: "#28473A",
  accent: "#C29A4B",
  accentPressed: "#A9813A",
  paper: "#EDE6D3",
  ink: "#26323B",
  textOnDark: "#EDE6D3",
  textOnDarkMuted: "#9FB3A8",
  liberal: "#3A6EA5",
  liberalDark: "#2A5078",
  fascist: "#9B2F24",
  fascistDark: "#7A251C",
  border: "#3E5A4C",
  borderOnPaper: "#C9BFA0",
  success: "#4C8C5B",
  danger: "#9B2F24",
  disabled: "#4B5A52",
  disabledText: "#7C8D83",
  overlayScrim: "rgba(12, 20, 16, 0.6)",
} as const

export type ColorToken = keyof typeof colors
