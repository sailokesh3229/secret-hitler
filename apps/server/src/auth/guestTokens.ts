/* Temporary demo identities are issued by the server. A caller cannot choose
   the uid or forge another player's bearer token. Keep this separate from
   Firebase accounts, which are the durable sign-in path. */
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import type { TokenVerifier } from "./tokenVerifier.js"

const LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

export function createGuestAuth(secret = randomBytes(32), now = Date.now): {
  verifier: TokenVerifier
  issueToken: () => string
} {
  if (secret.length < 32) throw new Error("Guest signing secret must have at least 32 bytes")
  const sign = (payload: string) => createHmac("sha256", secret).update(payload).digest("base64url")
  return {
    issueToken() {
      const payload = `guest.${randomUUID()}.${now() + LIFETIME_MS}`
      return `${payload}.${sign(payload)}`
    },
    verifier: {
      async verify(token) {
        const parts = token.split(".")
        if (parts.length !== 4 || parts[0] !== "guest") return null
        const [prefix, uid, expiry, signature] = parts
        if (!uid || !expiry || !signature || !/^\d+$/.test(expiry)) return null
        const expiresAt = Number(expiry)
        if (!Number.isSafeInteger(expiresAt) || expiresAt <= now()) return null
        const expected = Buffer.from(sign(`${prefix}.${uid}.${expiry}`), "base64url")
        const actual = Buffer.from(signature, "base64url")
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
        return { provider: "guest", providerUid: uid }
      },
    },
  }
}
