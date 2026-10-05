/* Public game log lines (spec Sec 4 S18). Never mentions hidden information: no roles, no discards, no individual votes before reveal. */
export const logCopy = {
  nominated: (president: string, chancellor: string) => `${president} nominated ${chancellor} as Chancellor.`,
  voted: (name: string) => `${name} voted.`,
  votingClosed: "Voting was closed. Missing votes count as No.",
  chaos: "Three governments failed in a row. The top policy was enacted.",
  enactedLiberal: "A Liberal policy was enacted.",
  enactedFascist: "A Fascist policy was enacted.",
  vetoRequested: (name: string) => `${name} requested a veto.`,
  vetoAgreed: "The President agreed to the veto. The election failed.",
  vetoRefused: "The President refused the veto.",
  investigated: (president: string, target: string) => `${president} investigated ${target}.`,
  specialElection: (target: string) => `${target} was chosen as the next President.`,
  executed: (target: string) => `${target} was executed.`,
  peeked: (president: string) => `${president} looked at the next three policies.`,
  gameOver: (team: string, reason: string) => `${team} win. ${reason}`,
} as const
