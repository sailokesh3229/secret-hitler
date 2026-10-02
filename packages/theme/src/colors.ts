/* spec Sec 9 design brief. Background updated per Review 1 design
   feedback (docs/design-feedback.md): the owner did not want the
   green baize default, so this is now a warm, dark walnut/leather
   table surface instead - same tense/tactile/period mood, no green.
   CLAUDE.md rule 6: every colour the app uses lives here, nothing
   hard-coded in apps/mobile. */
export const colors = {
  background: "#1C1714",
  surfaceRecessed: "#120E0C",
  surfaceRaised: "#2B231D",
  accent: "#C29A4B",
  accentPressed: "#A9813A",
  paper: "#EDE6D3",
  ink: "#26323B",
  textOnDark: "#EDE6D3",
  textOnDarkMuted: "#A69A8C",
  liberal: "#3A6EA5",
  liberalDark: "#2A5078",
  fascist: "#9B2F24",
  fascistDark: "#7A251C",
  border: "#473C32",
  borderOnPaper: "#C9BFA0",
  success: "#4C8C5B",
  danger: "#9B2F24",
  disabled: "#55493E",
  disabledText: "#9C8F80",
  overlayScrim: "rgba(10, 8, 6, 0.6)",
} as const

export type ColorToken = keyof typeof colors

/* Review 1 design feedback: every player gets an app-assigned avatar.
   This neutral palette is deliberately NOT liberal blue or fascist
   oxblood - an avatar is assigned before roles even exist, so it
   must never hint at team membership. apps/mobile hashes a player
   name to a stable index into this array. */
export const avatarTones = [
  "#C29A4B",
  "#6B5839",
  "#5C564C",
  "#8A5A3F",
  "#A8863F",
  "#7A6A54",
  "#9C7A3E",
  "#4F3F2E",
] as const
