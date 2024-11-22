import { motion, motionValue, useMotionTemplate as mt, useSpring, useTransform } from 'framer-motion'
import { ComponentProps, createContext, useContext } from 'react'
import * as Radix_RadioGroup from '@radix-ui/react-radio-group'
import { useMousePosition } from '@/hooks/use-mouse-position'
import { useDistance } from '@/hooks/use-distance'
import { cn } from '@/utils/tailwind-utils'
import { Vec2 } from '@/utils/math'

const groupContext = createContext({
  position: motionValue([Infinity, Infinity] as Vec2),
  animateRange: 150
})

type RadioGroupProps = ComponentProps<typeof Radix_RadioGroup.Root> & {
  animateRange?: number
}

export function RadioGroup({ animateRange = 150, ...props }: RadioGroupProps) {
  const [position, ref] = useMousePosition<HTMLDivElement>()
  return (
    <Radix_RadioGroup.Root ref={ref} {...props}>
      <groupContext.Provider value={{ position, animateRange }}>{props.children}</groupContext.Provider>
    </Radix_RadioGroup.Root>
  )
}

type RadioItemProps = ComponentProps<typeof MotionRadioItem> & {
  animateRange?: number
}

const MotionRadioItem = motion.create(Radix_RadioGroup.Item)

export function RadioItem({ children, ...props }: RadioItemProps) {
  const { position, animateRange } = useContext(groupContext)
  const [distance, ref] = useDistance<HTMLButtonElement>(position)

  const borderOpacitySync = useTransform(distance, [0, animateRange], [1, 0.2])
  const borderOpacity = useSpring(borderOpacitySync, {
    mass: 0.1,
    stiffness: 100
  })

  const backgroundOpacity = useTransform(borderOpacity, [0, 1], [0, 0.1])

  return (
    <MotionRadioItem
      ref={ref}
      {...props}
      style={{
        borderColor: mt`hsl(var(--foreground) / ${borderOpacity})`,
        backgroundColor: mt`hsl(var(--foreground) / ${backgroundOpacity})`
      }}
      className={cn(
        'h-full w-full cursor-pointer rounded-xl border-2 border-foreground data-[state=checked]:!border-primary data-[state=checked]:!bg-primary/20 data-[state=checked]:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.className
      )}
    >
      {children}
    </MotionRadioItem>
  )
}
