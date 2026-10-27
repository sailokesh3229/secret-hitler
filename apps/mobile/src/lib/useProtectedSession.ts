/* A direct web URL or browser refresh starts with an empty in-memory API
   token. Restore the provider session before any protected screen reads the
   profile or sends a request to the game server. */
import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { apiEnabled, currentUsername, serverConfigured } from "./api.js"
import { restoreSession } from "./firebase.js"

export type ProtectedSessionState = "loading" | "ready" | "error"

export function useProtectedSession(): { state: ProtectedSessionState; retry: () => void } {
  const router = useRouter()
  const [state, setState] = useState<ProtectedSessionState>(() =>
    !apiEnabled() || (serverConfigured() && Boolean(currentUsername())) ? "ready" : "loading",
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!apiEnabled() || (serverConfigured() && currentUsername())) {
      setState("ready")
      return
    }
    let active = true
    setState("loading")
    void restoreSession().then((session) => {
      if (!active) return
      if (session === "ready") setState("ready")
      else router.replace(session === "needs-username" ? "/username" : "/welcome")
    }).catch(() => {
      if (active) setState("error")
    })
    return () => { active = false }
  }, [attempt, router])

  return { state, retry: () => setAttempt((value) => value + 1) }
}
