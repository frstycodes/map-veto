import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Vec2 = [number, number]

export function distanceBetweenTwoVec2(a: Vec2, b: Vec2) {
  const [x1, y1] = a
  const [x2, y2] = b
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

export function isSameArray<T>(a: T[], b: T[]) {
  if (a.length !== b.length) return false
  const bSet = new Set(b)

  for (const item of a) {
    if (!bSet.has(item)) return false
  }
  return true
}
