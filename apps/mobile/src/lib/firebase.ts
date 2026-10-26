/* The same Firebase email identity is used by web, installable desktop web,
   Android and iOS. The server verifies ID tokens and owns game state. */
import { getApp, getApps, initializeApp } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth"
import { api, ApiError, apiEnabled, setSessionToken, setSessionUsername, setTokenProvider } from "./api.js"
import { createAuthClient } from "./firebaseAuth"
import { clearGuestSession, restoreGuestSession } from "./guestSession.js"

const CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
}

export function firebaseConfigured(): boolean {
  return Boolean(CONFIG.apiKey && CONFIG.authDomain && CONFIG.projectId && CONFIG.appId)
}

let authInstance: Auth | null = null

function authClient(): Auth {
  if (authInstance) return authInstance
  if (!firebaseConfigured()) throw new Error("FIREBASE_NOT_CONFIGURED")
  const app = getApps().length ? getApp() : initializeApp(CONFIG)
  authInstance = createAuthClient(app)
  const auth = authInstance
  setTokenProvider(async () => auth.currentUser ? auth.currentUser.getIdToken() : null)
  return auth
}

async function adoptToken(): Promise<void> {
  const user = authClient().currentUser
  if (!user) throw new Error("NOT_SIGNED_IN")
  const token = await user.getIdToken()
  setSessionToken(token)
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(authClient(), email, password)
  await adoptToken()
}

export async function createAccountWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(authClient(), email, password)
  await adoptToken()
}

export async function resetEmailPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(authClient(), email)
}

export async function signOutAccount(): Promise<void> {
  if (firebaseConfigured()) await signOut(authClient())
  await clearGuestSession()
  setSessionToken(null)
  setSessionUsername("")
}

export type RestoredSession = "signed-out" | "needs-username" | "ready"

export async function restoreSession(): Promise<RestoredSession> {
  if (!firebaseConfigured()) return restoreGuestSession()
  const auth = authClient()
  await auth.authStateReady()
  if (!auth.currentUser) return "signed-out"
  await adoptToken()
  if (!apiEnabled()) return "needs-username"
  try {
    const me = await api.me()
    setSessionUsername(me.username)
    return "ready"
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return "needs-username"
    throw error
  }
}
