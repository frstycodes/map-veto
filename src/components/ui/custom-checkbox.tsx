import {
  motion,
  MotionProps,
  MotionValue,
  motionValue,
  useSpring,
  useTransform,
  useMotionTemplate as mt
} from 'framer-motion'
import React, { ComponentProps, createContext, useContext, useState } from 'react'
import { useMousePosition } from '@/hooks/use-mouse-position'
import { playHoverSound } from '@/assets/sfx/hover/hover'
import { cn, SQUIRCLE_SM } from '@/utils/tailwind-utils'
import * as Checkbox from '@radix-ui/react-checkbox'
import { useDistance } from '@/hooks/use-distance'
import { Vec2 } from '@/utils/math'

const groupContext = createContext({
  mousePosition: motionValue([Infinity, Infinity] as Vec2),
  animateRange: 0
})

type CheckboxGroupProps = {
  children: React.ReactNode
  className?: string
  value?: string[]
  onValueChange?: (value: string[]) => void
  animateRange?: number
}

export function CheckboxGroup({
  children,
  className,
  value,
  onValueChange,
  animateRange = 150
}: CheckboxGroupProps) {
  const [mousePosition, ref] = useMousePosition<HTMLDivElement>()
  const [uncontrolledItems, setCheckedItems] = useState<string[]>(value ?? [])
  const checkedItems = value ?? uncontrolledItems

  const handleCheckedChange = (itemValue: string, checked: boolean) => {
    const newCheckedItems = checked
      ? [...checkedItems, itemValue]
      : checkedItems.filter((item) => item !== itemValue)

    setCheckedItems(newCheckedItems)
    onValueChange?.(newCheckedItems)
  }

  return (
    <div ref={ref} className={className}>
      <groupContext.Provider value={{ mousePosition, animateRange }}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              // @ts-expect-error - Child is always CheckboxItem
              checked: checkedItems.includes(child.props.value),
              onCheckedChange: (checked: boolean) => handleCheckedChange(child.props.value, checked)
            })
          }
          return child
        })}
      </groupContext.Provider>
    </div>
  )
}

type CheckboxItemProps = ComponentProps<typeof Checkbox.Root> &
  MotionProps & {
    render?: (props: { distance: MotionValue<number> }) => React.ReactNode
  }

export function CheckboxItem({ children, render, ...props }: CheckboxItemProps) {
  const { mousePosition, animateRange } = useContext(groupContext)

  const [distance, ref] = useDistance<HTMLDivElement>(mousePosition)
  const distanceFrac = useTransform(distance, [0, animateRange], [0, 1])

  const borderOpacitySync = useTransform(distance, [0, animateRange], [1, 0.2])
  const borderOpacity = useSpring(borderOpacitySync, { mass: 0.1, stiffness: 100 })
  const backgroundOpacity = useTransform(borderOpacity, [0, 1], [0, 0.1])

  const backgroundColor = mt`hsl(var(--foreground) / ${backgroundOpacity})`

  return (
    <Checkbox.Root
      {...props}
      onMouseEnter={(e) => {
        playHoverSound(1)
        props.onMouseEnter?.(e)
      }}
      className={cn('group', props.className)}
    >
      <motion.div
        ref={ref}
        style={{ backgroundColor }}
        className={cn(
          'glass-edge relative cursor-pointer group-data-[state=checked]:!bg-primary/20 group-data-[state=checked]:text-foreground',
          SQUIRCLE_SM,
          props.className
        )}
      >
        {render ? render({ distance: distanceFrac }) : children}
      </motion.div>
    </Checkbox.Root>
  )
}
