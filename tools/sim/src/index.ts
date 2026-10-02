/* tools/sim - test-only scripted clients and the game simulator (CLAUDE.md
   rule 8: never shipped to production). The 10,000-game random-legal-play
   simulator and leak test land per plan.md Step 4. This placeholder proves
   the package resolves its workspace dependencies end to end, now against
   the real Step 2 engine exports instead of a Step 1 placeholder. */
import { MAX_PLAYER_COUNT, MIN_PLAYER_COUNT } from "@game/engine"
import { PROTOCOL_PACKAGE_NAME } from "@game/protocol"

export const SIM_PACKAGE_NAME = "@game/sim"
export const SIM_PLAYER_COUNT_RANGE: [number, number] = [MIN_PLAYER_COUNT, MAX_PLAYER_COUNT]
export const SIM_DEPENDS_ON = [PROTOCOL_PACKAGE_NAME]
