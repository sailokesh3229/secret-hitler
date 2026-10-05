/* JSON that survives a restart: engine state holds Maps and Sets, which plain
   JSON drops. Tagged so the reviver can restore them exactly. */
export function serializeState(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item instanceof Map) return { __map: [...item.entries()] }
    if (item instanceof Set) return { __set: [...item.values()] }
    return item
  })
}

export function deserializeState<T>(text: string): T {
  return JSON.parse(text, (_key, item: unknown) => {
    if (item && typeof item === "object" && "__map" in item) return new Map((item as { __map: [unknown, unknown][] }).__map)
    if (item && typeof item === "object" && "__set" in item) return new Set((item as { __set: unknown[] }).__set)
    return item
  }) as T
}
