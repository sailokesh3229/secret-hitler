/* Firebase Authentication in the app (spec Sec 11, plan Step 9). Email and
   password works in Expo Go through the Firebase JS SDK. Phone, Google and
   Apple need native modules and an EAS development build, so they are not
   wired here. Active only when the EXPO_PUBLIC_FIREBASE_* config is set;
   otherwise the fake login screens stay in use. Sign-in is not persisted
   across app restarts yet (needs the React Native persistence build). */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, type Auth } from "firebase/auth"
import { setSessionToken } from "./api.js"

const CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
}

export function firebaseConfigured(): boolean {
  return CONFIG.apiKey.length > 0 && CONFIG.projectId.length > 0
}

let authInstance: Auth | null = null

function authClient(): Auth {
  if (authInstance) return authInstance
  const existing: FirebaseApp | undefined = getApps()[0]
  const app = existing ?? initializeApp(CONFIG)
  authInstance = getAuth(app)
  return authInstance
}

async function adoptToken(): Promise<string> {
  const user = authClient().currentUser
  if (!user) throw new Error("NOT_SIGNED_IN")
  const token = await user.getIdToken()
  setSessionToken(token)
  return token
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(authClient(), email, password)
  await adoptToken()
}

export async function createAccountWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(authClient(), email, password)
  await adoptToken()
}
