export function canFail<E extends Error, T>(fn: () => T): [E | null, T | null] {
  try {
    const result = fn()
    return [null, result]
  } catch (e) {
    if (e instanceof Error) return [e as E, null]
    return [new Error('Unknown Error') as E, null]
  }
}
