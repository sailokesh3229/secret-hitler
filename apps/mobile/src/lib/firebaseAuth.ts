/* Metro uses this on Android/iOS; the web build uses firebaseAuth.web.ts. */
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { FirebaseApp } from "firebase/app"
import * as firebaseAuth from "firebase/auth"
import type { Auth, Persistence } from "firebase/auth"

type NativeAuthModule = typeof firebaseAuth & {
  getReactNativePersistence(storage: typeof AsyncStorage): Persistence
}

export function createAuthClient(app: FirebaseApp): Auth {
  const nativeAuth = firebaseAuth as NativeAuthModule
  try {
    return nativeAuth.initializeAuth(app, { persistence: nativeAuth.getReactNativePersistence(AsyncStorage) })
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/already-initialized") throw error
    return nativeAuth.getAuth(app)
  }
}
