/* packages/engine public API. Pure functions only: no I/O, no timers, no
   Math.random (CLAUDE.md rule 3). Setup and role knowledge (R1-R10) land
   here in plan.md Step 2. Elections, legislation, powers and win checks
   follow in Steps 3-4. */

export * from "./types.js"
export * from "./deck.js"
export * from "./roles.js"
export * from "./boards.js"
export * from "./seating.js"
export * from "./knowledge.js"
