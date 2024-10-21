import { useMotionValue } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Vec2 } from '@/lib/utils'

export function useMousePosition<T extends HTMLElement>(initial: Vec2 = [Infinity, Infinity]) {
  const ref = useRef<T>(null)
  const position = useMotionValue(initial)

  const onMouseMove = (e: MouseEvent) => {
    position.set([e.clientX, e.clientY])
  }

  const onMouseLeave = () => {
    position.set(initial)
  }

  useEffect(() => {
    const element = ref.current!

    element.addEventListener('mousemove', onMouseMove)
    element.addEventListener('mouseleave', onMouseLeave)

    return () => {
      element.removeEventListener('mousemove', onMouseMove)
      element.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return [position, ref] as const
}
