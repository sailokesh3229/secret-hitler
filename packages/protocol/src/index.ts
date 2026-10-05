/* packages/protocol - event names, payload types and zod schemas shared by
   apps/mobile and apps/server (spec Sec 13). Real events land per plan.md
   Steps 10-11. This placeholder proves zod wires through the workspace. */
import { z } from "zod"

export const PROTOCOL_PACKAGE_NAME = "@game/protocol"

export const pingSchema = z.object({
  type: z.literal("ping"),
})

export type Ping = z.infer<typeof pingSchema>
export * from "./username.js"
