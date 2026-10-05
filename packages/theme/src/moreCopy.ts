/* Copy for the history, profile, how-to-play and credits screens (spec S20-S22,
   spec Sec 15). Rules wording follows docs/spec.md Sec 5. */
export const moreCopy = {
  historyTitle: "Game history",
  historyEmpty: "No finished games yet. Your games appear here after they end.",
  historyWins: (wins: number, total: number) => `${wins} of ${total} games won`,
  historyWon: "Won",
  historyLost: "Lost",
  historyDetailTitle: "Game",
  historyPlayers: "Players",
  historyLog: "Public record",
  historyLoadFailed: "Could not load your games. Check your connection and try again.",

  profileTitle: "Profile and settings",
  profileUsername: "Username",
  profileSettings: "Settings",
  profileSound: "Sound",
  profileHaptics: "Haptics",
  profileReducedMotion: "Reduced motion",
  profileSignOut: "Log out",
  profileDelete: "Delete account",
  profileDeleteSheet: "Delete your account?",
  profileDeleteBody: "This removes your username and sign-in from Secret Hitler. Finished games you played in stay visible to the other players, without your name. This cannot be undone.",
  profileDeleteConfirm: "Delete my account",
  profileDeleteFailed: "Could not delete your account. Check your connection and try again.",
  profileHowToPlay: "How to play",
  profileCredits: "Credits and license",

  howToTitle: "How to play",
  howToSearch: "Search the rules",
  howToNoMatch: "No rule matches that search.",

  creditsTitle: "Credits and license",
  creditsBody:
    "The rules of Secret Hitler are by Mike Boxleiter, Tommy Maranges and Mac Schubert. They are licensed under CC BY-NC-SA 4.0. This app is a non-commercial fan version and is not made or endorsed by them.",
  creditsLicenseLink: "View the license",
  creditsLicenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  creditsStoreNote: "Store release needs the creators' approval, or a rebrand (spec Sec 15). Until then this build is for friends and testing.",
} as const

export interface HowToSection {
  title: string
  body: string
}

export const howToSections: HowToSection[] = [
  {
    title: "The goal",
    body: "Liberals win by enacting 5 Liberal policies or by executing Hitler. Fascists win by enacting 6 Fascist policies, or by electing Hitler Chancellor after 3 Fascist policies are in play.",
  },
  {
    title: "Secret roles",
    body: "Each player gets a secret role. Liberals know only their own role. With 5 or 6 players, the Fascist knows who Hitler is and Hitler knows who the Fascist is. With 7 to 10 players, Fascists see each other and Hitler, and Hitler sees nobody. Hold the envelope to look at your role, and let go to hide it.",
  },
  {
    title: "A round",
    body: "The President nominates a Chancellor. Everyone votes Yes or No. The government is elected only with more than half of the living players voting Yes. A tie fails. The presidency then passes clockwise to the next living player.",
  },
  {
    title: "Policies",
    body: "After an election the President sees 3 policy tiles and discards one. The Chancellor gets the other 2, discards one, and enacts the last one. The enacted tile is shown to everyone. Discarded tiles are never shown until the game ends.",
  },
  {
    title: "Failed elections and Chaos",
    body: "A failed election moves the election tracker up by one. When 3 elections fail in a row, Chaos enacts the top policy without a vote, and the tracker resets.",
  },
  {
    title: "Presidential powers",
    body: "When a Fascist policy lands on a power slot, the President uses that power: Investigate (see one player's party), Special Election (choose the next President), Policy Peek (see the next 3 tiles) or Execution (remove a player). Which power appears depends on the number of players, and the board shows each slot's power.",
  },
  {
    title: "Veto",
    body: "After 5 Fascist policies, the Chancellor may ask for a veto. If the President agrees, both tiles are discarded and the election counts as failed. If the President refuses, the Chancellor must enact one of the two.",
  },
  {
    title: "Term limits",
    body: "The last elected President and Chancellor cannot be nominated Chancellor. With 5 or fewer players alive, only the last elected Chancellor is blocked.",
  },
  {
    title: "Talking",
    body: "In-person games are played out loud. In Online games there is one chat for living players. The President and Chancellor cannot chat while they hold policy tiles, and executed players can watch but not talk, vote or be chosen.",
  },
]
