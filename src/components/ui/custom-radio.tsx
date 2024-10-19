import {
  motion,
  motionValue,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion'
import { ComponentProps, createContext, useContext, useRef } from 'react'
import * as __RadioGroup from '@radix-ui/react-radio-group'
import { cn, dist, Vec2 } from '@/lib/utils'

const groupContext = createContext({
  position: motionValue([Infinity, Infinity]),
  animateRange: 150
})

type RadioGroupProps = ComponentProps<typeof __RadioGroup.Root> & {
  animateRange?: number
}

export function RadioGroup({ animateRange = 150, ...props }: RadioGroupProps) {
  const position = useMotionValue([Infinity, Infinity])
  return (
    <__RadioGroup.Root
      onMouseMove={(e) => position.set([e.clientX, e.clientY])}
      onMouseLeave={() => position.set([Infinity, Infinity])}
      {...props}
    >
      <groupContext.Provider value={{ position, animateRange }}>
        {props.children}
      </groupContext.Provider>
    </__RadioGroup.Root>
  )
}
// region Radio Item

const MotionRadioItem = motion.create(__RadioGroup.Item)

type RadioItemProps = ComponentProps<typeof MotionRadioItem> & {
  animateRange?: number
}
export function RadioItem({ children, ...props }: RadioItemProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const { position, animateRange } = useContext(groupContext)

  const distance = useTransform(position, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
      y: 0,
      height: 0
    }
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2
    const center = [centerX, centerY] as Vec2
    const distance = dist(val as Vec2, center)
    return Math.abs(distance)
  })
  const borderOpacitySync = useTransform(distance, [0, animateRange], [1, 0.2])
  const borderOpacity = useSpring(borderOpacitySync, {
    mass: 0.1,
    stiffness: 100
  })
  const backgroundOpacity = useTransform(borderOpacity, [0, 1], [0, 0.1])
  const backgroundColor = useTransform(backgroundOpacity, (opacity) => {
    return `hsl(var(--foreground) / ${opacity})`
  })
  const borderColor = useTransform(borderOpacity, (opacity) => {
    return `hsl(var(--foreground) / ${opacity})`
  })

  return (
    <MotionRadioItem
      ref={ref}
      {...props}
      style={{ borderColor, backgroundColor }}
      className={cn(
        'cursor-pointer rounded-xl w-full h-full border-2 border-foreground data-[state=checked]:!border-primary data-[state=checked]:!bg-primary/20 data-[state=checked]:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.className
      )}
    >
      {children}
    </MotionRadioItem>
  )
}
