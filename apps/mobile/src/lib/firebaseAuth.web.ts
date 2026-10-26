/* The web and installable desktop app use browser local persistence. */
import type { FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"

export function createAuthClient(app: FirebaseApp): Auth {
  return getAuth(app)
}
