/* spec Sec 9 names the signature interactions (hold-to-reveal envelope,
   drag tile to discard, ballots flip together) but gives no numeric
   timings - these are the conventional defaults they run on. CLAUDE.md
   rule 7 (no tells): every role and every private result must use
   these same durations, never a role-specific variant. Reduced-motion
   is a fixed rule (spec Sec 9) - apps/mobile checks the OS preference
   and substitutes durationReducedMotion for all of these, it is not a
   separate token set here. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  holdToReveal: 600,
  ballotFlip: 500,
  durationReducedMotion: 0,
} as const
