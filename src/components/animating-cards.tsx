import {
  animate,
  motion,
  MotionProps,
  motionValue,
  MotionValue,
  useMotionTemplate as mt,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform
} from 'framer-motion'
import {
  Children,
  ComponentProps,
  createContext,
  HTMLProps,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { SPRING_OPTS } from '@/config/motion-config'
import { getRippleRenderer } from '@/lib/ripple-gl'
import { cn } from '@/utils/tailwind-utils'
import { Time } from '@/utils/time'

// Magnification falls off over this many card widths, so it feels the same with 7 cards or 2
const FALLOFF_CARDS = 3.5

type ContainerContextType = {
  mouseX: MotionValue<number>
  cardWidth: number
  sizeMultiplier: number
}
const containerContext = createContext<ContainerContextType>({
  mouseX: motionValue(Infinity),
  cardWidth: 40,
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

  // Card distances only recompute on mouse move; after a card leaves, the stale cursor
  // would keep magnifying around old positions, so settle back to even widths
  useEffect(() => {
    mouseX.set(Infinity)
    gapAmount.set(_gap)
  }, [childrenCount, mouseX, gapAmount, _gap])

  return (
    <motion.div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: mt`${gapAmount}px`,
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
      <containerContext.Provider value={{ mouseX, cardWidth, sizeMultiplier }}>
        {props.children}
      </containerContext.Provider>
    </motion.div>
  )
}

type RenderFn = (props: { distance: MotionValue<number> }) => ReactNode

type AnimatingCardProps<T extends RenderFn | undefined> = Omit<
  ComponentProps<typeof motion.button>,
  'children'
> & {
  render?: T
  children?: T extends undefined ? ReactNode : never
  holdFor: Time
  onHoldSuccess?: () => void
  /** Palette of the hold burst: what the hold is about to do */
  holdTone?: HoldTone
}

export function AnimatingCard<T extends RenderFn | undefined>({
  style,
  className,
  children,
  render: Render,
  holdFor = Time.MS * 500,
  onHoldSuccess,
  holdTone = 'ban',
  ...props
}: AnimatingCardProps<T>) {
  const ref = useRef<HTMLButtonElement>(null)

  const { mouseX, cardWidth, sizeMultiplier } = useContext(containerContext)
  const range = [0, cardWidth * FALLOFF_CARDS]

  const distance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    const centerX = rect.x + rect.width / 2
    const dist = val - centerX
    return Math.abs(dist)
  })

  const distanceFrac = useTransform(distance, [...range, Number.MAX_VALUE], [0, 1, 0])

  const flexSync = useTransform(distance, range, [sizeMultiplier, 1])
  const flex = useSpring(flexSync, SPRING_OPTS)

  const focusSync = useTransform(
    distance,
    range.map((v) => v / 2),
    [1, 0]
  )
  const focus = useSpring(focusSync, SPRING_OPTS)

  const scaleSync = useTransform(distance, range, [1 + sizeMultiplier / 15, 1])
  const scale = useSpring(scaleSync, SPRING_OPTS)

  const zIndex = useTransform(distance, range, [100, 0])

  const holdProgress = useMotionValue(0)
  // A card removed mid-hold (opponent acted, veto reset) must not commit afterwards
  useEffect(() => () => holdProgress.stop(), [holdProgress])
  // Stable across renders: the ripple's frame loop depends on it
  const [burstOrigin] = useState(() => ({
    x: motionValue(0),
    y: motionValue(0),
    reach: motionValue(1)
  }))

  // One animation owns holdProgress: starting the hold cancels a running release (and vice versa)
  // and resumes from the current value, and a cancelled animation never calls onComplete
  function handleHold(e: React.MouseEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    const card = e.currentTarget
    const { x, y } = toCardPoint(card, e.clientX, e.clientY)
    burstOrigin.x.set(x)
    burstOrigin.y.set(y)
    burstOrigin.reach.set(
      Math.hypot(Math.max(x, card.offsetWidth - x), Math.max(y, card.offsetHeight - y))
    )
    animate(holdProgress, 100, {
      duration: (holdFor / 1000) * (1 - holdProgress.get() / 100),
      ease: 'linear',
      onComplete: onHoldSuccess
    })
  }

  function handleHoldReset() {
    animate(holdProgress, 0)
  }
  return (
    <motion.button
      ref={ref}
      onMouseDown={handleHold}
      onMouseUp={(e) => {
        handleHoldReset()
        props.onMouseUp?.(e)
      }}
      onMouseLeave={(e) => {
        handleHoldReset()
        props.onMouseLeave?.(e)
      }}
      style={{
        // Real width (not a flex share) keeps idle cards at cardWidth however many remain
        width: mt`calc(${flex} * ${cardWidth}px)`,
        flexShrink: 0,
        zIndex,
        scale,
        skewX: -8,
        // Drives the glass rim brightness in index.css instead of a colored outline
        ['--focus' as string]: focus,
        ...style
      }}
      className={cn('relative overflow-hidden rounded-md shadow-md', className)}
      {...props}
    >
      <HoldBurst progress={holdProgress} origin={burstOrigin} tone={holdTone} />
      <RippleContent progress={holdProgress} origin={burstOrigin} holdFor={holdFor}>
        {Render ? (
          // @ts-expect-error - Render is always a react component
          <Render distance={distanceFrac} />
        ) : (
          children
        )}
      </RippleContent>
    </motion.button>
  )
}

// The burst mask and ripple shader draw in the card's own box, but the card is scaled and skewed on
// screen, so the press point is mapped back through its transform. The transform is centred and the
// card's outline is point-symmetric, so the bounding box centre is the card's centre.
function toCardPoint(card: HTMLElement, clientX: number, clientY: number) {
  const rect = card.getBoundingClientRect()
  const transform = new DOMMatrix(getComputedStyle(card).transform)
  transform.e = 0
  transform.f = 0
  const fromCentre = new DOMPoint(
    clientX - (rect.left + rect.width / 2),
    clientY - (rect.top + rect.height / 2)
  )
  const point = transform.inverse().transformPoint(fromCentre)
  return { x: point.x + card.offsetWidth / 2, y: point.y + card.offsetHeight / 2 }
}

type HoldTone = 'ban' | 'pick'


// Ported from alibi-proto's LikeBurst: two broken fields turning against each other, one the
// bright rim, the other the bloom, so the edge flares where they meet and goes quiet where they miss
const BURST_FIELDS = {
  ban: {
    rim: 'conic-gradient(rgb(255 59 48) 0%, rgb(255 106 77 / 0.8) 12%, rgb(255 106 77 / 0) 24%, rgb(224 17 95 / 0.9) 42%, rgb(255 45 85 / 0.5) 58%, rgb(255 45 85 / 0) 70%, rgb(255 138 122 / 0.85) 86%, rgb(255 59 48) 100%)',
    pools:
      'conic-gradient(rgb(224 17 95 / 0.9) 0%, rgb(224 17 95 / 0) 20%, rgb(255 59 48) 38%, rgb(255 59 48 / 0) 56%, rgb(255 106 77 / 0.8) 74%, rgb(224 17 95 / 0.9) 100%)'
  },
  pick: {
    rim: 'conic-gradient(rgb(52 211 153) 0%, rgb(110 231 183 / 0.8) 12%, rgb(110 231 183 / 0) 24%, rgb(16 185 129 / 0.9) 42%, rgb(45 212 191 / 0.5) 58%, rgb(45 212 191 / 0) 70%, rgb(167 243 208 / 0.85) 86%, rgb(52 211 153) 100%)',
    pools:
      'conic-gradient(rgb(16 185 129 / 0.9) 0%, rgb(16 185 129 / 0) 20%, rgb(52 211 153) 38%, rgb(52 211 153 / 0) 56%, rgb(45 212 191 / 0.8) 74%, rgb(16 185 129 / 0.9) 100%)'
  }
} satisfies Record<HoldTone, unknown>

const BURST = {
  /** Total turn of the rim over a full hold; the pools turn this share of it the other way */
  spin: 200,
  counterSpin: 0.7,
  /** Soft edge of the wave front, px */
  front: 24,
  /** The front overshoots the farthest corner so the last corner is fully lit at commit */
  overshoot: 1.15
}

type BurstOrigin = { x: MotionValue<number>; y: MotionValue<number>; reach: MotionValue<number> }

type HoldBurstProps = {
  progress: MotionValue<number>
  origin: BurstOrigin
  tone: HoldTone
}

// A wave leaves the press point as the hold fills, the way iOS's Siri glow leaves the side button;
// the edge glow is lit only as far as the wave has reached
function HoldBurst({ progress, origin, tone }: HoldBurstProps) {
  const isReduced = useReducedMotion()
  const front = useTransform(() =>
    isReduced
      ? origin.reach.get() * 2
      : (progress.get() / 100) * origin.reach.get() * BURST.overshoot
  )
  const opacity = useTransform(progress, [0, 6], [0, 1])
  const spin = useTransform(progress, [0, 100], [0, BURST.spin])
  const counterSpin = useTransform(spin, (deg) => -deg * BURST.counterSpin)
  const reveal = mt`radial-gradient(circle at ${origin.x}px ${origin.y}px, #000 calc(${front}px - ${BURST.front}px), transparent calc(${front}px + ${BURST.front}px))`
  const fields = BURST_FIELDS[tone]

  return (
    <motion.div
      style={{ opacity }}
      className='pointer-events-none absolute inset-0 z-40 rounded-[inherit]'
    >
      <motion.div
        style={{ maskImage: reveal, WebkitMaskImage: reveal }}
        className='absolute inset-0 rounded-[inherit]'
      >
        {/* wash just inside the edge, bloom, rim glow, rim line: back to front */}
        <EdgeField field={fields.pools} rotate={counterSpin} ring={28} blur={18} opacity={0.4} />
        <EdgeField field={fields.pools} rotate={counterSpin} ring={18} blur={16} opacity={0.85} />
        <EdgeField field={fields.rim} rotate={spin} ring={6} blur={5} />
        <EdgeField field={fields.rim} rotate={spin} ring={2} />
      </motion.div>
    </motion.div>
  )
}

type EdgeFieldProps = {
  field: string
  rotate: MotionValue<number>
  ring: number
  blur?: number
  opacity?: number
}

function EdgeField({ field, rotate, ring, blur = 0, opacity = 1 }: EdgeFieldProps) {
  return (
    // Blur sits on the wrapper so it softens the already-masked ring instead of being cut by it
    <div
      style={{ filter: blur ? `blur(${blur}px)` : undefined, opacity }}
      className='absolute inset-0 rounded-[inherit]'
    >
      <div
        style={{ padding: ring }}
        className='edge-ring absolute inset-0 overflow-hidden rounded-[inherit]'
      >
        {/* Centred with negative margins, not translate: framer owns this element's transform */}
        <motion.div
          style={{ rotate, backgroundImage: field }}
          className='absolute left-1/2 top-1/2 -ml-[250px] -mt-[250px] size-[500px]'
        />
      </div>
    </div>
  )
}

type RippleContentProps = {
  progress: MotionValue<number>
  origin: BurstOrigin
  holdFor: number
  children: ReactNode
}

// While held, the content's <img> is redrawn through the WebGL ripple shader (lib/ripple-gl) in its
// own layer, so scrims and labels above it stay put. Per frame only uniforms change.
function RippleContent({ progress, origin, holdFor, children }: RippleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isActive, setIsActive] = useState(false)
  const isReduced = useReducedMotion()

  useMotionValueEvent(progress, 'change', (value) => setIsActive(!isReduced && value > 0))

  useEffect(() => {
    const image = contentRef.current?.querySelector('img')
    const renderer = getRippleRenderer()
    if (!isActive || !image?.complete || !renderer) return

    const content = contentRef.current!
    const contentBox = content.getBoundingClientRect()
    const imageBox = image.getBoundingClientRect()
    // Burst origin is relative to the card; the shader wants it relative to the image
    const shift = [imageBox.left - contentBox.left, imageBox.top - contentBox.top]

    let frame = 0
    const release = () => {
      cancelAnimationFrame(frame)
      image.style.visibility = ''
      // Another card may have claimed the canvas since; it is only ours while it follows our image
      if (image.nextElementSibling === renderer.canvas) renderer.canvas.remove()
    }
    renderer.claim(release)

    renderer.setSource(image)
    Object.assign(renderer.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: getComputedStyle(image).zIndex,
      pointerEvents: 'none'
    })
    image.after(renderer.canvas)
    image.style.visibility = 'hidden'

    const draw = () => {
      const seconds = holdFor / 1000
      renderer.draw({
        origin: [origin.x.get() - shift[0], origin.y.get() - shift[1]],
        time: (progress.get() / 100) * seconds,
        // Matches the burst's front, so the distortion rides under the lit edge
        speed: (origin.reach.get() * BURST.overshoot) / seconds
      })
      frame = requestAnimationFrame(draw)
    }
    draw()

    return release
  }, [isActive, progress, origin, holdFor])

  return (
    <div ref={contentRef} className='size-full'>
      {children}
    </div>
  )
}
