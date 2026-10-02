/* Every user-facing word in the app. CLAUDE.md rule 6: the engine and
   packages/protocol use neutral identifiers (TEAM_LIBERAL, ROLE_LEADER,
   VOTE_YES...) precisely so this one file can be swapped for a
   rebrand without touching game logic. Keyed by those same engine
   identifiers so a lookup is always teamNames[team], never a
   hand-written string. */
export const teamNames = {
  TEAM_LIBERAL: "Liberal",
  TEAM_FASCIST: "Fascist",
} as const

export const roleNames = {
  ROLE_LIBERAL: "Liberal",
  ROLE_FASCIST: "Fascist",
  ROLE_LEADER: "Hitler",
} as const

/* Review 1 design feedback: English Yes/No, not Ja/Nein (docs/design-
   feedback.md). */
export const voteLabels = {
  VOTE_YES: "Yes",
  VOTE_NO: "No",
} as const

export const policyLabels = {
  POLICY_LIBERAL: "Liberal policy",
  POLICY_FASCIST: "Fascist policy",
} as const

/* spec Sec 7.2 power screen copy, keyed by the boards power
   identifiers. */
export const powerNames = {
  POWER_INVESTIGATE: "Investigate",
  POWER_SPECIAL_ELECTION: "Special Election",
  POWER_POLICY_PEEK: "Policy Peek",
  POWER_EXECUTION: "Execution",
} as const

export const powerDescriptions = {
  POWER_INVESTIGATE: "Look at the party membership of one player. You can share it or lie about it.",
  POWER_SPECIAL_ELECTION: "Choose the next President. Afterwards the order continues from the player after you.",
  POWER_POLICY_PEEK: "Look at the next 3 policies in the deck. Their order will not change.",
  POWER_EXECUTION: "Remove one player from the game. If they are Hitler, Liberals win.",
} as const

/* Seat badges, spec Sec 4. */
export const badgeLabels = {
  president: "President",
  chancellor: "Chancellor",
  nominee: "Nominee",
  termLimited: "Term-limited",
  voted: "Voted",
  executed: "Executed",
  investigated: "Investigated",
  notHitler: "Not Hitler",
  host: "Host",
  disconnected: "Disconnected",
} as const

/* Common action labels. CLAUDE.md: buttons name the action exactly.
   Screen-specific copy (e.g. "Nominate Arjun") is built from a player
   name at runtime in later steps - these are the reusable, name-free
   ones. */
export const actionLabels = {
  castVote: "Cast vote",
  revealVotes: "Reveal votes",
  closeVoting: "Close voting",
  confirm: "Confirm",
  cancel: "Cancel",
  done: "Done",
  close: "Close",
  requestVeto: "Request veto",
  agreeToVeto: "Agree to veto",
  refuseVeto: "Refuse veto",
  playAgain: "Play again",
  home: "Home",
} as const

/* Key types for each lookup table above, so apps/mobile can type a
   prop as "the engines TeamToken" instead of a loose string. */
export type TeamToken = keyof typeof teamNames
export type RoleToken = keyof typeof roleNames
export type VoteToken = keyof typeof voteLabels
export type PolicyToken = keyof typeof policyLabels
export type PowerToken = keyof typeof powerNames
export type BadgeKind = keyof typeof badgeLabels
export type ActionLabelKey = keyof typeof actionLabels
