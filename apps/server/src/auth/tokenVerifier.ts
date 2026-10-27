/* Firebase ID token verification (spec Sec 11, Step 9). The server trusts
   only a verified provider UID. Google's public certificates are sufficient;
   this does not require a service-account private key. */
import { createPublicKey, verify as verifySignature } from "node:crypto"

export interface VerifiedIdentity {
  provider: string
  providerUid: string
}

export interface TokenVerifier {
  verify(idToken: string): Promise<VerifiedIdentity | null>
}

export const rejectingVerifier: TokenVerifier = {
  verify: () => Promise.resolve(null),
}

const CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

interface FirebaseClaims {
  aud?: unknown
  iss?: unknown
  sub?: unknown
  exp?: unknown
  iat?: unknown
  auth_time?: unknown
  firebase?: { sign_in_provider?: unknown }
}

/* Firebase publishes rotating RSA signing certificates. Cache them for the
   duration Google specifies and fail closed on any fetch or validation error. */
export function createFirebaseVerifier(
  env: NodeJS.ProcessEnv,
  options: { fetcher?: typeof fetch; now?: () => number } = {},
): TokenVerifier {
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) throw new Error("Firebase is not configured: set FIREBASE_PROJECT_ID")
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? Date.now
  let certificates: Record<string, string> = {}
  let certificatesExpireAt = 0

  async function certificateFor(kid: string): Promise<string | null> {
    if (now() >= certificatesExpireAt) {
      const response = await fetcher(CERT_URL, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return null
      const received: unknown = await response.json()
      if (!received || typeof received !== "object" || Array.isArray(received)) return null
      certificates = Object.fromEntries(
        Object.entries(received).filter(([key, value]) => key.length > 0 && typeof value === "string"),
      )
      const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get("cache-control") ?? "")?.[1] ?? 0)
      certificatesExpireAt = now() + (Number.isSafeInteger(maxAge) ? maxAge * 1000 : 0)
    }
    return Object.hasOwn(certificates, kid) ? certificates[kid] ?? null : null
  }

  return {
    async verify(idToken) {
      try {
        if (idToken.length > 20000) return null
        const parts = idToken.split(".")
        if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null
        const [encodedHeader, encodedClaims, encodedSignature] = parts
        if (!encodedHeader || !encodedClaims || !encodedSignature) return null
        const header: unknown = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"))
        const claims: FirebaseClaims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as FirebaseClaims
        if (!header || typeof header !== "object" || !("alg" in header) || header.alg !== "RS256" || !("kid" in header) || typeof header.kid !== "string" || !header.kid) return null
        const seconds = Math.floor(now() / 1000)
        if (claims.aud !== projectId || claims.iss !== "https://securetoken.google.com/" + projectId) return null
        if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 128) return null
        if (typeof claims.exp !== "number" || claims.exp <= seconds) return null
        if (typeof claims.iat !== "number" || claims.iat > seconds) return null
        if (typeof claims.auth_time !== "number" || claims.auth_time > seconds) return null
        if (typeof claims.firebase?.sign_in_provider !== "string" || !claims.firebase.sign_in_provider) return null
        const pem = await certificateFor(header.kid)
        if (!pem) return null
        const valid = verifySignature("RSA-SHA256", Buffer.from(encodedHeader + "." + encodedClaims), createPublicKey(pem), Buffer.from(encodedSignature, "base64url"))
        return valid ? { provider: claims.firebase.sign_in_provider, providerUid: claims.sub } : null
      } catch {
        return null
      }
    },
  }
}

/* Local development only: accepts "dev:<name>" as a token so several phones
   can join a room before Firebase is configured. Used only when the
   environment sets ALLOW_DEV_LOGIN=true and Firebase is not configured. */
export function createDevVerifier(): TokenVerifier {
  return {
    verify(idToken) {
      if (!idToken.startsWith("dev:") || idToken.length <= "dev:".length) return Promise.resolve(null)
      return Promise.resolve({ provider: "dev", providerUid: idToken.slice("dev:".length) })
    },
  }
}
