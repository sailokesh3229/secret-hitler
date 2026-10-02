/* tools/sim - test-only scripted clients and the game simulator (CLAUDE.md
   rule 8: never shipped to production). The 10,000-game random-legal-play
   simulator and leak test land per plan.md Step 4. This placeholder proves
   the package resolves its workspace dependencies end to end. */
import { ENGINE_PACKAGE_NAME } from "@game/engine"
import { PROTOCOL_PACKAGE_NAME } from "@game/protocol"

export const SIM_PACKAGE_NAME = "@game/sim"
export const SIM_DEPENDS_ON = [ENGINE_PACKAGE_NAME, PROTOCOL_PACKAGE_NAME]
