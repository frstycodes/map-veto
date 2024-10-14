import { cn, dist, Vec2 } from '@/lib/utils'
import {
  motion,
  MotionProps,
  MotionValue,
  motionValue,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion'
import { createContext, HTMLProps, useContext, useRef } from 'react'

type RadioGroupContextType = {
  position: MotionValue
  name: string
  value: string
  onValueChange: (value: string) => void
}

const groupContext = createContext<RadioGroupContextType>({
  position: motionValue([Infinity, Infinity]),
  name: '',
  value: '',
  onValueChange: () => {}
})

type RadioGroupProps = HTMLProps<HTMLDivElement> &
  MotionProps & {
    name: string
    value?: string
    onValueChange?: (value: string) => void
  }

export function RadioGroup({
  name,
  value = '',
  onValueChange = () => {},
  ...props
}: RadioGroupProps) {
  const position = useMotionValue([Infinity, Infinity])
  return (
    <motion.div
      onMouseMove={(e) => position.set([e.clientX, e.clientY])}
      onMouseLeave={() => position.set([Infinity, Infinity])}
      {...props}
    >
      <groupContext.Provider value={{ position, name, onValueChange, value }}>
        {props.children}
      </groupContext.Provider>
    </motion.div>
  )
}
type RadioProps = HTMLProps<HTMLDivElement> &
  MotionProps & {
    inputProps?: HTMLProps<HTMLInputElement>
    children?: React.ReactNode
    animateRange?: number
  }
export function Radio({
  children,
  inputProps,
  animateRange = 150,
  ...props
}: RadioProps) {
  const ref = useRef<HTMLLabelElement>(null)
  const { position, value, onValueChange, name } = useContext(groupContext)

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
    <label ref={ref}>
      <input
        defaultChecked={props.value === value}
        type='radio'
        name={name}
        value={props.value}
        onChange={(e) => onValueChange(e.target.value)}
        {...inputProps}
        className={cn('peer hidden', inputProps?.className)}
      />
      <motion.div
        style={{ borderColor, backgroundColor }}
        {...props}
        className={cn(
          'cursor-pointer rounded-md border-2 border-foreground peer-checked:!border-primary peer-checked:!bg-primary/20 peer-checked:text-foreground',
          props.className
        )}
      >
        {children}
      </motion.div>
    </label>
  )
}
