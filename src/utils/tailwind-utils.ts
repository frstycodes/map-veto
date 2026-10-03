import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Squircles need a larger radius to read as round as a circular corner; index.css applies the shape
export const SQUIRCLE = 'rounded-xl supports-[corner-shape:squircle]:rounded-[22px]'
export const SQUIRCLE_CONTROL = 'rounded-xl supports-[corner-shape:squircle]:rounded-[18px]'
export const SQUIRCLE_SM = 'rounded-lg supports-[corner-shape:squircle]:rounded-[14px]'
