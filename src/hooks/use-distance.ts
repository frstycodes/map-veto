import { distanceBetweenTwoVec2, Vec2 } from '@/utils/math'
import { MotionValue, useTransform } from 'framer-motion'
import { RefObject, useRef } from 'react'

export function useDistance<T extends HTMLElement>(
  mousePositionInsideContainer: MotionValue<Vec2>
): [MotionValue<number>, RefObject<T>] {
  const ref = useRef<T>(null)
  const distance = useTransform(mousePositionInsideContainer, (mousePosition) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
      y: 0,
      height: 0
    }
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2
    const center: Vec2 = [centerX, centerY]
    const distance = distanceBetweenTwoVec2(mousePosition, center)
    return Math.abs(distance)
  })
  return [distance, ref]
}
