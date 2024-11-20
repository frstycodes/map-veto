import {
  motion,
  MotionProps,
  motionValue,
  MotionValue,
  useMotionTemplate as mt,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion'
import { Children, ComponentProps, createContext, HTMLProps, ReactNode, useContext, useRef } from 'react'
import { SPRING_OPTS } from '@/config/motion-config'
import { cn } from '@/utils/tailwind-utils'

type ContainerContextType = {
  mouseX: MotionValue<number>
  containerWidth: number
  sizeMultiplier: number
}
const containerContext = createContext<ContainerContextType>({
  mouseX: motionValue(Infinity),
  containerWidth: 0,
  sizeMultiplier: 3
})

type AnimatingCardContainerProps = HTMLProps<HTMLDivElement> &
  MotionProps & {
    gap?: number
    sizeMultiplier?: number
    cardWidth?: number
  }

export function AnimatingCardContainer({
  gap: _gap = 0,
  sizeMultiplier = 3,
  cardWidth = 40,
  style,
  ...props
}: AnimatingCardContainerProps) {
  const mouseX = useMotionValue(Infinity)

  const gapAmount = useMotionValue(_gap)

  const childrenCount = Children.count(props.children)
  const width = childrenCount * cardWidth + childrenCount - 1 * _gap

  return (
    <motion.div
      style={{
        display: 'flex',
        gap: mt`${gapAmount}px`,
        width,
        ...style
      }}
      onMouseEnter={() => gapAmount.set(0)}
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => {
        gapAmount.set(_gap)
        mouseX.set(Infinity)
      }}
      {...props}
    >
      <containerContext.Provider value={{ mouseX, containerWidth: width, sizeMultiplier }}>
        {props.children}
      </containerContext.Provider>
    </motion.div>
  )
}

type RenderFn = (props: { distance: MotionValue<number> }) => ReactNode

type AnimatingCardProps<T extends RenderFn | undefined> = Omit<ComponentProps<typeof motion.button>, 'children'> & {
  render?: T
  children?: T extends undefined ? ReactNode : never
}

export function AnimatingCard<T extends RenderFn | undefined>({
  style,
  className,
  children,
  render: Render,
  ...props
}: AnimatingCardProps<T>) {
  const ref = useRef<HTMLButtonElement>(null)

  const { mouseX, containerWidth, sizeMultiplier } = useContext(containerContext)
  const range = [0, containerWidth / 2]

  const distance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    const centerX = rect.x + rect.width / 2
    const dist = val - centerX
    return Math.abs(dist)
  })

  const distanceFrac = useTransform(distance, [...range, Number.MAX_VALUE], [0, 1, 0])

  const flexSync = useTransform(distance, range, [sizeMultiplier, 1])
  const flex = useSpring(flexSync, SPRING_OPTS)

  const outlineOpacitySync = useTransform(
    distance,
    range.map((v) => v / 2),
    [1, 0]
  )
  const outlineOpacity = useSpring(outlineOpacitySync, SPRING_OPTS)

  const blurAmount = useTransform(distance, [0, 100, Number.MAX_VALUE], [0, 1, 0])

  const scaleSync = useTransform(distance, range, [1 + sizeMultiplier / 15, 1])
  const scale = useSpring(scaleSync, SPRING_OPTS)

  const zIndex = useTransform(distance, range, [100, 0])

  return (
    <motion.button
      ref={ref}
      style={{
        flex,
        zIndex,
        scale,
        skewX: -8,
        outlineColor: mt`hsl(var(--primary) / ${outlineOpacity})`,
        filter: mt`blur(${blurAmount}px)`,
        ...style
      }}
      className={cn('rounded-md shadow-md outline outline-2', className)}
      {...props}
      // @ts-expect-error - Render is always a react component
      children={Render ? <Render distance={distanceFrac} /> : children}
    />
  )
}
