const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateId(size: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes)
    .map((b) => ID_CHARS[b % ID_CHARS.length]!)
    .join('')
}

export function generateUUID(): string {
  return crypto.randomUUID()
}
