/* Shared public palette for the premium dossier theme. The game keeps the
   owner's dark background preference and gives both factions AA-readable
   colours with a separate word and emblem as required by spec Sec 9. */
export const colors = {
  background: "#101019",
  surfaceRecessed: "#151520",
  surfaceRaised: "#22212D",
  accent: "#E4B982",
  accentPressed: "#CDA16C",
  paper: "#F2E9DB",
  ink: "#1D1B25",
  textOnDark: "#F2EDE7",
  textOnDarkMuted: "#B8B1BE",
  liberal: "#326AA9",
  liberalDark: "#355F91",
  fascist: "#A8374B",
  fascistDark: "#873445",
  border: "#4B4654",
  borderOnPaper: "#C4B7A4",
  success: "#2F6B5F",
  danger: "#A8374B",
  disabled: "#3B3944",
  disabledText: "#A5A0AA",
  overlayScrim: "rgba(9, 9, 17, 0.72)",
  heroScrim: "rgba(9, 9, 17, 0.44)",
  glass: "rgba(30, 29, 42, 0.88)",
  highlight: "rgba(228, 185, 130, 0.14)",
} as const

export type ColorToken = keyof typeof colors

/* Review 1 design feedback: every player gets an app-assigned avatar.
   This neutral palette is deliberately NOT liberal blue or fascist
   oxblood - an avatar is assigned before roles even exist, so it
   must never hint at team membership. apps/mobile hashes a player
   name to a stable index into this array. */
export const avatarTones = [
  "#7A627E",
  "#A06F68",
  "#687C97",
  "#9B815C",
  "#776D92",
  "#758887",
  "#9D7283",
  "#696985",
] as const
