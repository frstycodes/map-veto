/**
 * Generates a unique n-character ID that satisfies the given predicate
 * @param predicate - Function that returns false with the generated ID will be rejected
 * @param size - Number of characters in the ID
 * @returns A 5-character string ID
 */

export function generateId(predicate?: (id: string) => boolean, size = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  while (true) {
    for (let i = 0; i < size; i++) {
      id += chars[Math.floor(Math.random() * chars.length)]
    }
    if (!predicate || predicate(id)) return id
  }
}
