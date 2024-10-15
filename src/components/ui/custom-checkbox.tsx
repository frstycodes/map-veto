import {
  motion,
  MotionProps,
  MotionValue,
  motionValue,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion'
import React, {
  ComponentProps,
  createContext,
  useContext,
  useRef,
  useState
} from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { cn, dist, Vec2 } from '@/lib/utils'

const groupContext = createContext<MotionValue>(
  motionValue([Infinity, Infinity])
)

type CheckboxGroupProps = {
  children: React.ReactNode
  className?: string
  value?: string[]
  onValueChange?: (value: string[]) => void
}

export function CheckboxGroup({
  children,
  className,
  value,
  onValueChange
}: CheckboxGroupProps) {
  const position = useMotionValue([Infinity, Infinity])
  const [checkedItems, setCheckedItems] = useState<string[]>(value ?? [])

  const handleCheckedChange = (itemValue: string, checked: boolean) => {
    const newCheckedItems = checked
      ? [...checkedItems, itemValue]
      : checkedItems.filter((item) => item !== itemValue)

    setCheckedItems(newCheckedItems)
    onValueChange?.(newCheckedItems)
  }

  return (
    <div
      className={className}
      onMouseMove={(e) => position.set([e.clientX, e.clientY])}
      onMouseLeave={() => position.set([Infinity, Infinity])}
    >
      <groupContext.Provider value={position}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              // @ts-expect-error - Child is always CheckboxItem
              checked: checkedItems.includes(child.props.value),
              onCheckedChange: (checked: boolean) =>
                handleCheckedChange(child.props.value, checked)
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
    animateRange?: number
    render?: React.FC<{ distance: MotionValue<number> }>
  }

export function CheckboxItem({
  children,
  animateRange = 150,
  render: Render,
  ...props
}: CheckboxItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const position = useContext(groupContext)

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
    const distance = dist(val, center)
    return Math.abs(distance)
  })
  const distanceFrac = useTransform(distance, [0, animateRange], [0, 1])

  const borderOpacitySync = useTransform(distanceFrac, [0, 1], [1, 0.2])
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
    <Checkbox.Root {...props} className={cn('group', props.className)}>
      <motion.div
        ref={ref}
        style={{ borderColor, backgroundColor }}
        className={cn(
          'cursor-pointer rounded-md border-2 border-foreground group-data-[state=checked]:!border-primary group-data-[state=checked]:!bg-primary/20 group-data-[state=checked]:text-foreground',
          props.className
        )}
      >
        {Render ? <Render distance={distanceFrac} /> : children}
      </motion.div>
    </Checkbox.Root>
  )
}
