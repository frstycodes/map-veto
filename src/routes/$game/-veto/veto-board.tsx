import {
  AnimatePresence,
  cancelFrame,
  frame,
  LayoutGroup,
  motion,
  MotionValue
} from 'framer-motion'
import { AnimatingMapCardContents } from '@/routes/$game/$id/$token/-components/map-components'
import { AnimatingCard, AnimatingCardContainer } from '@/components/animating-cards'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { playMapsHoverSound } from '@/assets/sfx/maps-hover/maps-hover.sfx'
import { landscapeImageProps, portraitImageProps } from '@/utils/image'
import { cn, SQUIRCLE, SQUIRCLE_SM } from '@/utils/tailwind-utils'
import { canControl, TeamIndex, Veto, VetoMap } from './veto'
import { MapData } from '@/config/games/game-config.types'
import { useLoaderData } from '@tanstack/react-router'
import { useCardTransition } from './card-transition'
import { Crown, Judge, Shield2 } from 'reicon-react'
import { Sword } from '@/components/icons/sword'
import { Image } from '@/components/image'
import { Time } from '@/utils/time'
import { sfx } from '@/lib/sfx'

const SPRING = { type: 'spring', duration: 0.6, bounce: 0.2 } as const

export function VetoBoard({ veto }: { veto: Veto }) {
  useVetoSfx(veto)
  const isSideStep = veto.isSidePhase || veto.isComplete
  return (
    <LayoutGroup>
      <div className='flex w-full flex-col gap-6'>
        <Scoreboard veto={veto} isSideStep={isSideStep} />
        {/* Once the veto is settled the board collapses: bans fold into the scoreboard and the series rises */}
        {!isSideStep && (
          <div className='grid grid-cols-2 items-start gap-x-6 gap-y-8 md:grid-cols-[176px_1fr_176px]'>
            <BanColumn team={1} veto={veto} />
            <Pool veto={veto} />
            <BanColumn team={2} veto={veto} />
          </div>
        )}
        <motion.div layout transition={SPRING}>
          <SeriesRow veto={veto} isSideStep={isSideStep} />
        </motion.div>
      </div>
    </LayoutGroup>
  )
}

function Scoreboard({ veto, isSideStep }: { veto: Veto; isSideStep: boolean }) {
  return (
    <div className='flex w-full items-start justify-between gap-2'>
      <TeamHeader team={1} veto={veto} isSideStep={isSideStep} />
      <p className='pt-2 text-sm font-bold italic'>vs</p>
      <TeamHeader team={2} veto={veto} isSideStep={isSideStep} />
    </div>
  )
}

type TeamHeaderProps = { team: TeamIndex; veto: Veto; isSideStep: boolean }

function TeamHeader({ team, veto, isSideStep }: TeamHeaderProps) {
  const activeTeam = useActiveTeam(veto)
  const isDimmed = activeTeam !== undefined && activeTeam !== team
  const bans = veto.actions.filter((a) => a.type === 'ban' && a.team === team)

  return (
    <div className={cn('flex flex-1 flex-col gap-2', team === 2 && 'items-end')}>
      <p
        className={cn(
          'text-2xl font-bold italic transition-colors duration-500',
          isDimmed && 'text-muted-foreground'
        )}
      >
        {veto.teams[team]}
      </p>
      {isSideStep && (
        <div className={cn('flex flex-wrap gap-1.5', team === 2 && 'justify-end')}>
          {bans.map(({ map }) => (
            <BanChip key={map} name={map} />
          ))}
        </div>
      )}
    </div>
  )
}

// Same layoutId as the ban slab, so each slab shrinks into its chip when the board collapses
function BanChip({ name }: { name: string }) {
  return (
    <motion.span
      layoutId={name}
      transition={SPRING}
      initial={{ skewX: -8 }}
      animate={{ skewX: -8 }}
      className='flex items-center gap-1 rounded-md bg-red-950/50 px-2 py-0.5 text-xs font-semibold text-red-200/80 backdrop-blur-sm'
    >
      <Judge aria-hidden weight='Filled' className='size-3 text-red-300/70' />
      <span className='line-through decoration-red-400/70'>{name}</span>
    </motion.span>
  )
}

function Pool({ veto }: { veto: Veto }) {
  const renderers = useCardRenderers()
  const { decider } = veto
  const isRevealing = decider?.phase === 'revealing'
  const remaining = veto.maps.filter(
    (m) => !m.action && m.data.name !== (isRevealing ? decider.map : undefined)
  )
  const visible = veto.isDone && !decider ? [] : remaining
  const isPickTurn = veto.stage?.type === 'pick'
  const canAct = !veto.isDone && canControl(veto.seat, veto.stage?.team)

  return (
    <div className='relative order-first col-span-2 flex min-h-64 items-center justify-center md:order-none md:col-span-1'>
      <AnimatingCardContainer cardWidth={56} gap={4}>
        {visible.map((map) => {
          return (
            <AnimatingCard
              key={map.data.name}
              layoutId={map.data.name}
              transition={SPRING}
              animate={{ opacity: isRevealing ? 0 : 1 }}
              disabled={!canAct}
              holdFor={Time.MS * 650}
              holdTone={isPickTurn ? 'pick' : 'ban'}
              onHoldSuccess={() => veto.act(map.data.name)}
              onMouseEnter={() => canAct && playMapsHoverSound(1)}
              className={cn(
                // Caps the hover expansion so the portrait art isn't cropped into a zoomed strip
                'glass-edge-image h-60 max-w-[150px] overflow-hidden shadow-lift',
                SQUIRCLE,
                canAct ? 'cursor-pointer' : 'cursor-default'
              )}
              render={renderers[map.data.name]}
            />
          )
        })}
      </AnimatingCardContainer>
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            key='decider-glow'
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.9, 0.6], scale: [0.4, 1.15, 1] }}
            exit={{ opacity: 0, scale: 1.6, transition: { duration: 0.5 } }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className='pointer-events-none absolute inset-0 -z-10 m-auto h-80 w-60 rounded-full bg-primary/40 blur-3xl'
          />
        )}
      </AnimatePresence>
      {isRevealing && <DeciderStage map={veto.maps.find((m) => m.data.name === decider.map)!} />}
    </div>
  )
}

function BanColumn({ team, veto }: { team: 1 | 2; veto: Veto }) {
  const bans = veto.actions.filter((a) => a.type === 'ban' && a.team === team)
  const totalBans = veto.stages.filter((s) => s.type === 'ban' && s.team === team).length
  const isRight = team === 2
  const isBanning = !veto.isDone && veto.stage?.type === 'ban' && veto.stage.team === team

  return (
    <motion.div
      layout
      transition={SPRING}
      className={cn('flex flex-col gap-2', isRight && 'items-end')}
    >
      <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
        Bans · {bans.length}/{totalBans}
      </p>
      {bans.map(({ map }) => (
        <BannedSlab key={map} map={veto.maps.find((m) => m.data.name === map)!} isRight={isRight} />
      ))}
      {Array.from({ length: totalBans - bans.length }, (_, i) => (
        <EmptySlot key={i} className={cn('h-14', SQUIRCLE_SM)} isActive={i === 0 && isBanning}>
          {i === 0 && isBanning && 'Banning…'}
        </EmptySlot>
      ))}
    </motion.div>
  )
}

function BannedSlab({ map, isRight }: { map: VetoMap; isRight: boolean }) {
  const { flight, crossfade, landingDelay, labelMove, labelUnwrap } = useCardTransition()
  const phase = useSlabPhase()
  const isStruck = phase === 'struck'
  const isLabelOpen = phase === 'unwrapping' || isStruck

  return (
    <motion.div
      layoutId={map.data.name}
      transition={flight}
      initial={{ skewX: -8 }}
      // The gavel's impact knocks the slab sideways for a beat
      animate={{ skewX: -8, x: isStruck ? [0, -4, 3, -1, 0] : 0 }}
      className={cn(
        'glass-edge-image relative z-10 h-14 w-full overflow-hidden shadow-lift',
        SQUIRCLE_SM
      )}
    >
      <ArrivingImage
        map={map.data}
        crossfade={crossfade}
        delay={landingDelay * 0.4}
        isMuted={isStruck}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isStruck ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-red-950/90 to-red-900/40',
          isRight && 'bg-gradient-to-l'
        )}
      />
      {isStruck && <LandingFlash delay={0} className='bg-red-500' />}
      <div
        className={cn(
          'absolute inset-0 flex items-center px-3',
          phase === 'flying' ? 'justify-center' : isRight ? 'justify-end' : 'justify-start'
        )}
      >
        <motion.span
          layout='position'
          initial={{ rotate: -90, scale: 1.15 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{
            ...LABEL_COMPRESS,
            layout: { type: 'spring', visualDuration: labelMove, bounce: 0.2 }
          }}
          className='relative'
        >
          <MorphingLabel name={map.data.name} isOpen={isLabelOpen} unwrap={labelUnwrap} />
          {isStruck && <ScribbleStrike />}
        </motion.span>
      </div>
      {isStruck && <GavelStrike isRight={isRight} />}
    </motion.div>
  )
}

type SlabPhase = 'flying' | 'moving' | 'unwrapping' | 'struck'

// flying → (lands) moving → (dot at its side) unwrapping → (label open) struck. Mount is the
// moment of the ban.
function useSlabPhase(): SlabPhase {
  const { landingDelay, labelMove, strikeDelay } = useCardTransition()
  const [phase, setPhase] = useState<SlabPhase>(strikeDelay ? 'flying' : 'struck')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('moving'), landingDelay * 1000),
      setTimeout(() => setPhase('unwrapping'), (landingDelay + labelMove) * 1000),
      setTimeout(() => setPhase('struck'), strikeDelay * 1000)
    ]
    return () => timers.forEach(clearTimeout)
    // Timeline is fixed at the moment of the ban, not re-run when the tuning panel changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return phase
}

// Squeezes to a dot for the flight, where the vertical label would clip against the shrinking
// slab, then unwraps back into the name once the dot reaches its side
function MorphingLabel({
  name,
  isOpen,
  unwrap
}: {
  name: string
  isOpen: boolean
  unwrap: number
}) {
  return (
    <motion.span
      initial={LABEL_OPEN}
      animate={isOpen ? LABEL_OPEN : LABEL_DOT}
      transition={isOpen ? { duration: unwrap, ease: [0.6, 0, 0.2, 1] } : LABEL_COMPRESS}
      className='flex items-center justify-center overflow-hidden rounded-full'
    >
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={isOpen ? { duration: unwrap * 0.6, delay: unwrap * 0.4 } : { duration: 0.1 }}
        className='whitespace-nowrap text-sm font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]'
      >
        {name}
      </motion.span>
    </motion.span>
  )
}

const LABEL_COMPRESS = { duration: 0.2, ease: 'easeIn' } as const

// Shadow fades with the fill, since box-shadow still renders around the open label's transparent box
const LABEL_OPEN = {
  width: 'auto',
  height: 'auto',
  backgroundColor: 'rgba(255, 255, 255, 0)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0)'
}

const LABEL_DOT = {
  width: 10,
  height: 10,
  backgroundColor: 'rgba(255, 255, 255, 1)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.6)'
}

// Looping scribble from animate-ui's playful-todolist, stretched to the label's width
function ScribbleStrike() {
  return (
    <svg
      aria-hidden
      viewBox='0 0 340 32'
      preserveAspectRatio='none'
      className='pointer-events-none absolute left-0 top-1/2 h-8 w-full -translate-y-1/2 overflow-visible'
    >
      <motion.path
        d='M 10 16.91 s 79.8 -11.36 98.1 -11.34 c 22.2 0.02 -47.82 14.25 -33.39 22.02 c 12.61 6.77 124.18 -27.98 133.31 -17.28 c 7.52 8.38 -26.8 20.02 4.61 22.05 c 24.55 1.93 113.37 -20.36 113.37 -20.36'
        vectorEffect='non-scaling-stroke'
        fill='none'
        strokeWidth={2}
        strokeLinecap='round'
        strokeMiterlimit={10}
        className='stroke-red-400'
        // Round caps draw a dot at pathLength 0, so opacity snaps on with the stroke
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.7, ease: 'easeInOut' },
          opacity: { duration: 0.01 }
        }}
      />
    </svg>
  )
}

// The gavel swings down onto the slab as the strike is drawn
function GavelStrike({ isRight }: { isRight: boolean }) {
  return (
    <div className={cn('absolute inset-y-0 flex items-center', isRight ? 'left-3' : 'right-3')}>
      <motion.span
        initial={{ rotate: -70, scale: 1.4, opacity: 0 }}
        // Every value needs as many keyframes as `times`: a lone opacity target fades back out
        // mid-swing and pops in at the end
        animate={{ rotate: [-70, 18, 0], scale: [1.4, 1, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.4, times: [0, 0.55, 1], ease: 'easeOut' }}
        style={{ originX: 1, originY: 1 }}
      >
        <Judge aria-hidden weight='Filled' className='size-4 text-white/80' />
      </motion.span>
    </div>
  )
}

function SeriesRow({ veto, isSideStep }: { veto: Veto; isSideStep: boolean }) {
  const slots = veto.stages.filter((s) => s.type === 'pick' || s.type === 'decider')
  const isPicking = !!veto.decider || (!veto.isDone && veto.stage?.type === 'pick')
  const nextSlot = veto.maps.filter((m) => !!m.order).length

  return (
    <div className={cn('flex flex-col gap-2', isSideStep && 'mx-auto w-full max-w-2xl')}>
      {!isSideStep && (
        <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Series</p>
      )}
      <div className={cn('flex gap-2', isSideStep && 'flex-col gap-3')}>
        {slots.map((slot, idx) => {
          const map = veto.maps.find((m) => m.order === idx + 1)
          if (map)
            return (
              <div
                key={map.data.name}
                className={cn(
                  'relative flex',
                  isSideStep ? 'w-full flex-wrap gap-y-2 lg:flex-nowrap' : 'flex-1'
                )}
              >
                <SeriesCard
                  map={map}
                  isSideStep={isSideStep}
                  chooser={
                    veto.pendingSide?.map === map.data.name ? veto.pendingSide.chooser : undefined
                  }
                />
                {isSideStep && (
                  <SideTags
                    attacker={map.attacker}
                    chooser={
                      veto.pendingSide?.map === map.data.name ? veto.pendingSide.chooser : undefined
                    }
                    canChoose={canControl(veto.seat, veto.pendingSide?.chooser)}
                    onChoose={veto.chooseSide}
                  />
                )}
              </div>
            )
          return (
            <EmptySlot
              key={idx}
              className={cn('h-28 flex-1', SQUIRCLE)}
              isActive={isPicking && idx === nextSlot}
            >
              Map {idx + 1} ·{' '}
              {slot.type === 'decider' ? 'Decider' : `${veto.teams[slot.team as TeamIndex]} pick`}
            </EmptySlot>
          )
        })}
      </div>
    </div>
  )
}

type SeriesCardProps = {
  map: VetoMap
  isSideStep: boolean
  chooser: TeamIndex | undefined
}

function SeriesCard({ map, isSideStep, chooser }: SeriesCardProps) {
  const { flight, crossfade, landingDelay } = useCardTransition()
  const isChoosing = !!chooser
  const action = map.action!
  const isDecider = action.type === 'decider'
  const isWaiting = isSideStep && !map.attacker && !isChoosing

  return (
    <motion.div
      layoutId={map.data.name}
      transition={flight}
      initial={{ skewX: -8 }}
      animate={{
        skewX: -8,
        opacity: isWaiting ? 0.5 : 1,
        // Leans toward the choosing team's side of the scoreboard
        x: chooser === 1 ? -10 : chooser === 2 ? 10 : 0
      }}
      className={cn(
        'glass-edge-image relative z-10 overflow-hidden shadow-lift',
        isSideStep ? 'h-24 w-full' : 'h-28 flex-1',
        SQUIRCLE,
        isChoosing && 'shadow-2xl shadow-black/50'
      )}
    >
      <ArrivingImage
        map={map.data}
        crossfade={crossfade}
        delay={landingDelay * 0.4}
        // Side-pick rows span the max-w-2xl series column
        sizes='(max-width: 672px) 100vw, 672px'
      />
      <div className='absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60' />
      <LandingFlash delay={landingDelay} className='bg-white' />
      {!isDecider && <PickEdge team={action.team as TeamIndex} delay={landingDelay} />}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0, transition: { delay: landingDelay + 0.1 } }}
        className='absolute left-4 top-2 flex items-baseline gap-2 text-white'
      >
        <span className='text-3xl font-black italic tabular-nums leading-none'>
          {String(map.order).padStart(2, '0')}
        </span>
      </motion.div>
      {isDecider && (
        <DeciderTag
          name={map.data.name}
          className='glass-edge absolute right-3 top-3 gap-1 px-2 py-0.5 text-xs shadow-lift [&_svg]:size-3'
        />
      )}
      <NameBar
        name={map.data.name}
        className='glass-edge absolute bottom-3 left-4 px-3 py-0.5 text-sm shadow-lift'
      />
    </motion.div>
  )
}

const SIDES = {
  attack: {
    label: 'Attack',
    Icon: Sword,
    wash: 'bg-red-500/20',
    tone: 'text-red-300',
    hover: 'hover:bg-red-500/20'
  },
  defend: {
    label: 'Defend',
    Icon: Shield2,
    wash: 'bg-sky-500/20',
    tone: 'text-sky-300',
    hover: 'hover:bg-sky-500/20'
  }
} as const

type SideTagsProps = {
  attacker: TeamIndex | undefined
  chooser: TeamIndex | undefined
  /** Only the choosing team gets the picker; everyone else sees that they're choosing */
  canChoose: boolean
  onChoose: (attack: boolean) => void
}

// Rows mirror the scoreboard: Team Alpha owns the left edge, Team Bravo the right.
// The chooser's picker and, afterwards, each team's side slide out from under the edge that belongs to them.
// Below lg there's no room beside the card, so the tags sit under it on the same sides.
// The 14px tuck hides a tab's inner edge under the card, so it reads as pulled out from behind it.
function SideTags({ attacker, chooser, canChoose, onChoose }: SideTagsProps) {
  return (
    <>
      {([1, 2] as const).map((team, i) => {
        const side = attacker ? (attacker === team ? 'attack' : 'defend') : undefined
        const isPicking = !attacker && chooser === team
        const isLeft = team === 1
        return (
          <div
            key={team}
            className={cn(
              'z-0 flex basis-1/2 items-center lg:absolute lg:inset-y-0',
              isLeft
                ? 'justify-start lg:right-full lg:-mr-[14px]'
                : 'justify-end lg:left-full lg:-ml-[14px]'
            )}
          >
            <AnimatePresence mode='popLayout'>
              {(!!side || isPicking) && (
                <motion.div
                  key={side ?? (canChoose ? 'picker' : 'choosing')}
                  initial={{ x: isLeft ? 48 : -48, opacity: 0, skewX: -8 }}
                  animate={{ x: 0, opacity: 1, skewX: -8 }}
                  exit={{ x: isLeft ? 48 : -48, opacity: 0, skewX: -8 }}
                  transition={{ ...SPRING, delay: side ? i * 0.08 : 0 }}
                  className={cn(
                    'glass-edge-image relative flex h-11 items-center overflow-hidden rounded-xl bg-neutral-900/90 text-white shadow-lift backdrop-blur-md lg:h-[72px]',
                    isLeft ? 'lg:rounded-r-none lg:pr-[14px]' : 'lg:rounded-l-none lg:pl-[14px]'
                  )}
                >
                  {side ? (
                    <SideTag side={side} />
                  ) : canChoose ? (
                    <SidePicker onChoose={onChoose} />
                  ) : (
                    <ChoosingTag />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </>
  )
}

function SideTag({ side }: { side: keyof typeof SIDES }) {
  const { Icon, label, wash, tone } = SIDES[side]
  return (
    <span
      className={cn(
        'flex h-full items-center gap-1.5 px-4 text-xs font-bold uppercase tracking-wide',
        wash,
        tone
      )}
    >
      <Icon aria-hidden weight='Filled' className='size-4' />
      {label}
    </span>
  )
}

function ChoosingTag() {
  return (
    <span className='flex h-full items-center px-4 text-xs font-semibold uppercase tracking-wide'>
      <span className='t-shimmer' data-text='Choosing…'>
        Choosing…
      </span>
    </span>
  )
}

function SidePicker({ onChoose }: { onChoose: (attack: boolean) => void }) {
  return (
    <div className='flex h-full divide-x divide-white/10 lg:flex-col lg:divide-x-0 lg:divide-y'>
      {(['attack', 'defend'] as const).map((side) => {
        const { Icon, label, tone, hover } = SIDES[side]
        return (
          <button
            key={side}
            onClick={() => onChoose(side === 'attack')}
            className={cn(
              'flex flex-1 items-center gap-1.5 px-4 text-xs font-semibold transition-colors',
              hover
            )}
          >
            <Icon aria-hidden weight='Filled' className={cn('size-4', tone)} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function DeciderStage({ map }: { map: VetoMap }) {
  const art = useFlightSizedArt(SPRING.duration)
  const name = map.data.name

  return (
    // Card sits dead centre so it lines up with the pool's halo; labels hang off its right edge
    <div className='pointer-events-none absolute inset-0 z-20 grid place-items-center'>
      <div className='relative'>
        <motion.div
          layoutId={name}
          transition={SPRING}
          initial={{ skewX: -8 }}
          animate={{ skewX: -8 }}
          className={cn(
            'glass-edge-image relative h-64 w-44 shrink-0 overflow-hidden shadow-2xl shadow-black/60',
            SQUIRCLE
          )}
        >
          <motion.div layout='position' className='absolute inset-0'>
            <div ref={art} className='absolute left-0 top-0 size-full'>
              <Image
                role='presentation'
                {...portraitImageProps(map.data)}
                className='absolute inset-0 size-full object-cover object-center'
              />
            </div>
          </motion.div>
          <motion.div
            initial={{ x: '-120%' }}
            animate={{ x: '320%' }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className='absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent'
          />
        </motion.div>
        <div className='absolute left-full top-1/2 ml-5 flex -translate-y-1/2 -skew-x-[8deg] flex-col items-start gap-1.5 whitespace-nowrap'>
          <motion.div
            initial={{ x: -60, opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
            animate={{ x: 0, opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
            transition={{ ...SPRING, delay: 0.12 }}
          >
            <NameBar name={name} className='px-4 py-0.5 text-4xl' />
          </motion.div>
          <motion.div
            initial={{ x: -40, opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
            animate={{ x: 0, opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
            transition={{ ...SPRING, delay: 0.22 }}
          >
            <DeciderTag
              name={name}
              className='glass-edge relative gap-1.5 px-4 py-0.5 text-sm shadow-lift [&_svg]:size-4'
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Shared via layoutId so the reveal labels travel into the series card instead of vanishing
type LabelProps = { name: string; className?: string }

function NameBar({ name, className }: LabelProps) {
  return (
    <motion.div
      layoutId={`${name}-bar`}
      transition={SPRING}
      className={cn(
        'flex items-baseline gap-2 bg-primary font-bold text-primary-foreground',
        className
      )}
    >
      <motion.span layout>{name}</motion.span>
    </motion.div>
  )
}

function DeciderTag({ name, className }: LabelProps) {
  return (
    <motion.div
      layoutId={`${name}-tag`}
      transition={SPRING}
      className={cn(
        'flex w-fit items-center bg-amber-400 font-bold uppercase text-black',
        className
      )}
    >
      <Crown aria-hidden />
      <motion.span layout>Decider</motion.span>
    </motion.div>
  )
}

// Credits the picking team spatially: rows mirror the scoreboard, so Alpha's pick lights the left rim
function PickEdge({ team, delay }: { team: TeamIndex; delay: number }) {
  const isLeft = team === 1
  return (
    <motion.div
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ ...SPRING, delay }}
      className={cn(
        'absolute inset-y-0 z-10 w-0.5 bg-gradient-to-b from-transparent via-white to-transparent',
        isLeft
          ? 'left-0 shadow-[2px_0_10px_rgb(255_255_255/0.5)]'
          : 'right-0 shadow-[-2px_0_10px_rgb(255_255_255/0.5)]'
      )}
    />
  )
}

function LandingFlash({ delay, className }: { delay: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.6, 0] }}
      transition={{ delay, duration: 0.7, times: [0, 0.15, 1] }}
      className={cn('pointer-events-none absolute inset-0 z-10 mix-blend-overlay', className)}
    />
  )
}

type EmptySlotProps = { className?: string; isActive?: boolean; children?: React.ReactNode }

function EmptySlot({ className, isActive, children }: EmptySlotProps) {
  return (
    <div
      className={cn(
        'relative grid w-full -skew-x-[8deg] place-items-center overflow-hidden border-2 border-dashed border-border px-2 text-center text-xs text-muted-foreground transition-colors duration-500',
        isActive && 'border-solid border-primary font-bold uppercase tracking-wide text-foreground',
        className
      )}
    >
      {isActive && (
        <motion.div
          className='absolute inset-0 bg-primary/20'
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span className='relative'>{children}</span>
    </div>
  )
}

// Cards arrive from the portrait pool: the portrait art fades out as the landscape art fades in.
// layout='position' stops the parent's size animation from stretching the art.
type ArrivingImageProps = {
  map: MapData
  crossfade: number
  /** Seconds into the flight before the art starts to change */
  delay?: number
  /** Drains the art to greyscale, for a banned slab once struck */
  isMuted?: boolean
  /** Rendered width of the landscape art, for srcset selection */
  sizes?: string
}

function ArrivingImage({ map, crossfade, delay = 0, isMuted = false, sizes }: ArrivingImageProps) {
  const { landingDelay } = useCardTransition()
  const art = useFlightSizedArt(landingDelay)
  const imageClass = 'absolute inset-0 size-full object-cover object-center'
  const swap = { duration: crossfade, delay, ease: [0.4, 0, 0.2, 1] } as const

  return (
    <motion.div
      layout='position'
      animate={{ filter: isMuted ? 'grayscale(1)' : 'grayscale(0)' }}
      transition={{ duration: 0.3 }}
      className='absolute inset-0'
    >
      <div ref={art} className='absolute left-0 top-0 size-full'>
        {/* Landscape art settles in from a slight blur and zoom while the portrait art dissolves */}
        <Image
          asMotion
          role='presentation'
          {...landscapeImageProps(map, sizes)}
          initial={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={swap}
          className={imageClass}
        />
        <Image
          asMotion
          role='presentation'
          {...portraitImageProps(map)}
          initial={{ opacity: 1, filter: 'blur(0px)' }}
          animate={{ opacity: 0, filter: 'blur(6px)' }}
          transition={swap}
          className={cn(imageClass, 'pointer-events-none')}
        />
      </div>
    </motion.div>
  )
}

// layout='position' cancels the card's flight scale for the art, so the art is sized to the card's
// on-screen box by hand. postRender runs after the projection writes the card's transform and
// before paint, so the two never disagree by a frame. A layout-tracked box can't resize itself
// instead: its correction is computed from the size measured at mount, so it drifts.
function useFlightSizedArt(flightSeconds: number) {
  const ref = useRef<HTMLDivElement>(null)

  // Layout effect, so the frame loop picks this up before the first painted frame of the flight
  useLayoutEffect(() => {
    const art = ref.current!
    const card = art.parentElement!.offsetParent as HTMLElement
    const sync = () => {
      const { a: scaleX, d: scaleY } = new DOMMatrix(card.style.transform || 'none')
      art.style.width = `${card.offsetWidth * scaleX}px`
      art.style.height = `${card.offsetHeight * scaleY}px`
    }
    const release = () => {
      cancelFrame(sync)
      art.style.width = art.style.height = ''
    }
    frame.postRender(sync, true)
    // Outlasts the spring's settling tail, which runs past its visual duration
    const settled = setTimeout(release, (flightSeconds + 1) * 1000)
    return () => {
      clearTimeout(settled)
      release()
    }
    // Timeline is fixed at mount, like the flight it follows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}

// AnimatingCard renders `render` as a component; a fresh arrow per render would remount the image
function useCardRenderers() {
  const { config } = useLoaderData({ from: '/$game' })
  return useMemo(
    () =>
      Object.fromEntries(
        config.maps.map((map) => [
          map.name,
          ({ distance }: { distance: MotionValue<number> }) => (
            <AnimatingMapCardContents distance={distance} map={map} />
          )
        ])
      ),
    [config]
  )
}

// Sounds fire on impact, not on input, and only for moments that change the veto
function useVetoSfx(veto: Veto) {
  const { landingDelay, strikeDelay } = useCardTransition()
  const prevCount = useRef(veto.actions.length)
  const isRevealing = veto.decider?.phase === 'revealing'

  useEffect(() => {
    const grew = veto.actions.length > prevCount.current
    prevCount.current = veto.actions.length
    if (!grew) return

    const last = veto.actions.at(-1)!
    if (last.type === 'decider') return
    const isBan = last.type === 'ban'
    const slot = veto.actions.filter((a) => a.type === 'pick').length - 1
    const impact = setTimeout(
      () => (isBan ? sfx.ban() : sfx.pick(slot)),
      (isBan ? strikeDelay : landingDelay) * 1000
    )
    return () => clearTimeout(impact)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veto.actions])

  useEffect(() => {
    if (!isRevealing) return
    sfx.reveal()
    // Peaks as the shine crosses the card and the name and Decider tag slide in on the right
    sfx.whoosh()
  }, [isRevealing])

  const sidedCount = veto.maps.filter((m) => !!m.attacker).length
  const prevSided = useRef(sidedCount)
  useEffect(() => {
    const grew = sidedCount > prevSided.current
    prevSided.current = sidedCount
    // Side choices are the teams' business; viewers watch them land in silence
    if (!grew || veto.seat === 'viewer') return
    const choice = [...veto.logs].reverse().find((log) => log.data.event === 'side-pick')?.data
    if (choice?.event === 'side-pick') sfx[choice.side]()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidedCount])
}

// Holds the last active team through the short hand-off between side picks, so names don't flash bright
function useActiveTeam(veto: Veto): TeamIndex | undefined {
  const last = useRef<TeamIndex | undefined>(undefined)
  const current =
    veto.pendingSide?.chooser ?? (veto.isDone ? undefined : (veto.stage?.team as TeamIndex))
  if (veto.isSidePhase && !veto.pendingSide) return last.current
  last.current = current
  return current
}
