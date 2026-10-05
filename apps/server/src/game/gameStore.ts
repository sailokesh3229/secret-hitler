/* Live game persistence (plan Step 11: Redis persistence with restart recovery).
   The service writes the whole serialized game after every accepted action.
   Production uses Redis; tests use the in-memory store, and a second server
   built on the same store proves a restart resumes the game. */
export interface KeyValueClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<unknown>
}

export function createMemoryKeyValue(): KeyValueClient {
  const values = new Map<string, string>()
  return {
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set: (key, value) => {
      values.set(key, value)
      return Promise.resolve("OK")
    },
  }
}

export function gameKey(roomCode: string): string {
  return "game:" + roomCode
}
