import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { useEffect, useRef } from 'react'

const springOpts = {
  damping: 20,
  stiffness: 300
}

const defaultSize = 24
export function Cursor() {
  const mouseXSync = useMotionValue(0)
  const mouseX = useSpring(mouseXSync, springOpts)

  const mouseYSync = useMotionValue(0)
  const mouseY = useSpring(mouseYSync, springOpts)

  const heightSync = useMotionValue(defaultSize)
  const height = useSpring(heightSync, springOpts)

  const widthSync = useMotionValue(defaultSize)
  const width = useSpring(widthSync, springOpts)

  const borderRadiusSync = useMotionValue(defaultSize / 2)
  const borderRadius = useSpring(borderRadiusSync, springOpts)
  const unit = useMotionValue('px')

  const transform = useMotionValue('none')
  const styles = useMotionValue({})

  const handleMouseMove = (e: MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    //@ts-ignore
    const el = e.target?.closest('button') || e.target?.closest('a') || e.target?.closest('[role=button]')

    mouseXSync.set(x)
    mouseYSync.set(y)

    if (el instanceof HTMLButtonElement) {
      const rect = el.getBoundingClientRect()
      const style = el.computedStyleMap()

      styles.set(style)
      heightSync.set(rect.height || defaultSize)
      widthSync.set(rect.width || defaultSize)
      mouseXSync.set(rect.left)
      mouseYSync.set(rect.top)

      const radiusRaw = el.computedStyleMap().get('border-radius')?.toString()
      const _transform = el.computedStyleMap().get('transform')?.toString()
      transform.set(_transform || 'none')

      const radius = parseCssSize(radiusRaw || '0px')
      borderRadiusSync.set(radius[0] + 4)
      unit.set(radius[1])
      return
    }
    styles.set({})
    transform.set('none')
    heightSync.set(defaultSize)
    widthSync.set(defaultSize)
    borderRadiusSync.set(defaultSize / 2)
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  const ref = useRef<HTMLDivElement>(null)
  return (
    <>
      <motion.div
        ref={ref}
        transition={{
          type: 'spring',
          duration: 10
        }}
        style={{
          height,
          width,
          position: 'fixed',
          top: mouseY,
          left: mouseX,
          zIndex: 999,
          borderRadius: useMotionTemplate`${borderRadius}${unit}`,
          transform
        }}
        className='rounded-full outline outline-2 shadow-lg -translate-x-1/2 pointer-events-none -translate-y-1/2'
      />
    </>
  )
}

const parseCssSize = (value: string) => {
  let num = ''
  let unit = ''
  for (const char of value.split('')) {
    const parsed = Number(char)
    if (isNaN(parsed)) {
      unit += char
    } else {
      num += char
    }
  }
  return [parseInt(num), unit] as const
}
