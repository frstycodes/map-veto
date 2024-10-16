import {
  motion,
  MotionProps,
  MotionValue,
  motionValue,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion'
import {
  ComponentProps,
  createContext,
  HTMLProps,
  useContext,
  useRef
} from 'react'
import * as __RadioGroup from '@radix-ui/react-radio-group'
import { cn, dist, Vec2 } from '@/lib/utils'

const groupContext = createContext<MotionValue>(
  motionValue([Infinity, Infinity])
)

type RadioGroupProps = ComponentProps<typeof __RadioGroup.Root>

export function RadioGroup(props: RadioGroupProps) {
  const position = useMotionValue([Infinity, Infinity])
  return (
    <__RadioGroup.Root
      onMouseMove={(e) => position.set([e.clientX, e.clientY])}
      onMouseLeave={() => position.set([Infinity, Infinity])}
      {...props}
    >
      <groupContext.Provider value={position}>
        {props.children}
      </groupContext.Provider>
    </__RadioGroup.Root>
  )
}
// region Radio Item
type RadioItemProps = ComponentProps<typeof __RadioGroup.Item> & {
  animateRange?: number
  rootProps?: MotionProps & HTMLProps<HTMLDivElement>
}
export function RadioItem({
  children,
  animateRange = 150,
  rootProps,
  ...props
}: RadioItemProps) {
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
    <motion.div {...rootProps}>
      <__RadioGroup.Item {...props} className='group'>
        <motion.div
          ref={ref}
          style={{ borderColor, backgroundColor }}
          className={cn(
            'cursor-pointer rounded-md  border-2 border-foreground group-data-[state=checked]:!border-primary group-data-[state=checked]:!bg-primary/20 group-data-[state=checked]:text-foreground',
            props.className
          )}
        >
          {children}
        </motion.div>
      </__RadioGroup.Item>
    </motion.div>
  )
}
