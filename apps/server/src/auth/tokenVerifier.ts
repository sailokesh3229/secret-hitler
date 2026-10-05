/* Firebase ID token verification (spec Sec 11, Step 9). The server never trusts a client-sent user id: it verifies the token and uses the provider uid. Configured from .env (never committed). */
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

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

export function createFirebaseVerifier(env: NodeJS.ProcessEnv): TokenVerifier {
  const projectId = env.FIREBASE_PROJECT_ID
  const clientEmail = env.FIREBASE_CLIENT_EMAIL
  const privateKey = env.FIREBASE_PRIVATE_KEY
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env")
  }
  const appName = "secret-hitler"
  const app = getApps().find((existing) => existing.name === appName) ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\n/g, "\n") }) }, appName)
  const auth = getAuth(app)
  return {
    async verify(idToken) {
      try {
        const decoded = await auth.verifyIdToken(idToken)
        return { provider: decoded.firebase.sign_in_provider, providerUid: decoded.uid }
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
