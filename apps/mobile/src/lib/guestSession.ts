/* Guest sign-in is a temporary server-issued session for the coursework demo.
   Persistence is best-effort; a browser that blocks storage still plays. */
import { api, ApiError, apiEnabled, setSessionToken, setSessionUsername } from "./api.js"
import { guestStorage } from "./guestStorage"

const STORAGE_KEY = "secret-hitler-guest-token"

export async function startGuestSession(): Promise<void> {
  const { token } = await api.createGuestSession()
  setSessionToken(token)
  await guestStorage.set(STORAGE_KEY, token)
}

export async function clearGuestSession(): Promise<void> {
  await guestStorage.remove(STORAGE_KEY)
}

export async function restoreGuestSession(): Promise<"signed-out" | "needs-username" | "ready"> {
  if (!apiEnabled()) return "signed-out"
  const token = await guestStorage.get(STORAGE_KEY)
  if (!token) return "signed-out"
  setSessionToken(token)
  try {
    const me = await api.me()
    setSessionUsername(me.username)
    return "ready"
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return "needs-username"
    if (error instanceof ApiError && error.status === 401) {
      await clearGuestSession()
      setSessionToken(null)
      return "signed-out"
    }
    throw error
  }
}
