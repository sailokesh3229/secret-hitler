/* Browser storage is best-effort: the game can still start in a privacy mode
   that disables localStorage, but its temporary session ends on reload. */
export const guestStorage = {
  async get(key: string): Promise<string | null> {
    try { return window.localStorage.getItem(key) } catch { return null }
  },
  async set(key: string, value: string): Promise<void> {
    try { window.localStorage.setItem(key, value) } catch { /* in-memory session still works */ }
  },
  async remove(key: string): Promise<void> {
    try { window.localStorage.removeItem(key) } catch { /* nothing persisted */ }
  },
}
