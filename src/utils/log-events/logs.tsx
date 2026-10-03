import { Crosshairs, Crown, Download, Judge, Notes, Shield2 } from 'reicon-react'
import { MapData } from '@/config/games/game-config.types'
import { useLoaderData } from '@tanstack/react-router'
import { landscapeImageProps } from '@/utils/image'
import { Sword } from '@/components/icons/sword'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/image'
import { ReactNode, useRef } from 'react'
import { cn } from '../tailwind-utils'
import { motion } from 'framer-motion'
import convertToPng from '../html2png'

export type Log = {
  time: string
  data: VetoInitializationEvent | MapActionEvent | DeciderEvent | SidePickEvent
}

type VetoInitializationEvent = {
  event: 'init'
  maps: string[]
}

type MapActionEvent = {
  event: 'ban' | 'pick'
  map: string
  by: 1 | 2
}

type DeciderEvent = {
  event: 'decider'
  map: string
}

type SidePickEvent = {
  event: 'side-pick'
  map: string
  side: 'attack' | 'defend'
  team: 1 | 2
}

type Teams = { team1: string; team2: string }

type LogsProps = {
  logs: Log[]
  game: string
  teams: Teams
}

// The recap doubles as the PNG export, so it avoids backdrop-filter and pseudo-element rims,
// which html-to-image doesn't reproduce
export function Logs({ logs, game, teams }: LogsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { config } = useLoaderData({ from: '/$game' })
  const today = DATE_FORMAT.format(new Date())
  const series = logs.flatMap((log) =>
    log.data.event === 'pick' || log.data.event === 'decider'
      ? [{ map: log.data.map, isDecider: log.data.event === 'decider' }]
      : []
  )
  const findMap = (name: string) => config.maps.find((m) => m.name === name)

  return (
    <div className='flex flex-col'>
      <div ref={ref} className='bg-background p-6'>
        <header className='space-y-4'>
          <div className='flex items-center justify-between pr-8 text-[11px] font-bold uppercase tracking-wider'>
            <span className='text-primary'>{config.name} · Veto log</span>
            <span className='font-mono font-medium normal-case text-muted-foreground'>{today}</span>
          </div>
          <p className='flex items-baseline gap-3 text-2xl font-bold italic'>
            <span>{teams.team1}</span>
            <span className='text-sm text-muted-foreground'>vs</span>
            <span>{teams.team2}</span>
          </p>
          {!!series.length && (
            <div className='flex gap-2'>
              {series.map(({ map, isDecider }, i) => (
                <SeriesChip
                  key={map}
                  order={i + 1}
                  map={findMap(map)}
                  name={map}
                  isDecider={isDecider}
                />
              ))}
            </div>
          )}
        </header>

        <motion.ol
          initial='hidden'
          animate='visible'
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          className='relative mt-6'
        >
          {/* Rail runs through the centre of the marker column (3.5rem time + 0.75rem gap + half of 1.75rem) */}
          <div className='absolute inset-y-2 left-[5.125rem] w-px -translate-x-1/2 bg-border' />
          {logs.map((log, i) => {
            const phase = PHASE_STARTS[log.data.event]
            const showPhase = !!phase && PHASE_STARTS[logs[i - 1]?.data.event] !== phase
            return (
              <LogRow
                key={i}
                log={log}
                teams={teams}
                map={'map' in log.data ? findMap(log.data.map) : undefined}
                phase={showPhase ? phase : undefined}
              />
            )
          })}
        </motion.ol>

        <footer className='mt-6 flex justify-between text-[11px] text-muted-foreground'>
          <span>{logs.length} events</span>
          <span>
            Made with{' '}
            <a
              className='font-semibold text-foreground'
              href={window.location.origin}
              target='_blank'
            >
              {window.location.host}
            </a>
          </span>
        </footer>
      </div>
      <div className='flex justify-end border-t border-border px-6 py-3'>
        <Button
          size='sm'
          className='gap-2 text-xs'
          onClick={() =>
            convertToPng(ref, {
              name: `${game} ${teams.team1} vs ${teams.team2} ${today}`,
              scale: 4
            })
          }
        >
          <Download aria-hidden className='size-4' />
          Download PNG
        </Button>
      </div>
    </div>
  )
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium' })

// Consecutive events of one phase share a heading
const PHASE_STARTS: Partial<Record<Log['data']['event'], string>> = {
  ban: 'Map veto',
  pick: 'Map veto',
  decider: 'Decider',
  'side-pick': 'Sides'
}

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
}

const ROW_GRID = 'grid grid-cols-[3.5rem_1.75rem_1fr] items-center gap-3'

type LogRowProps = { log: Log; teams: Teams; map: MapData | undefined; phase: string | undefined }

function LogRow({ log, teams, map, phase }: LogRowProps) {
  const { Icon, tone } = getMarker(log)
  const isBan = log.data.event === 'ban'

  return (
    <>
      {!!phase && (
        <motion.li variants={ROW_VARIANTS} className={cn(ROW_GRID, 'pb-1 pt-4')}>
          <span />
          <span className='relative mx-auto size-1.5 rounded-full bg-muted-foreground' />
          <p className='text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
            {phase}
          </p>
        </motion.li>
      )}
      <motion.li variants={ROW_VARIANTS} className={cn(ROW_GRID, 'py-1.5')}>
        <time className='font-mono text-[11px] tabular-nums text-muted-foreground'>
          {TIME_FORMAT.format(new Date(log.time))}
        </time>
        <span
          className={cn(
            'relative grid size-7 place-items-center rounded-full ring-4 ring-background',
            tone
          )}
        >
          <Icon aria-hidden weight='Filled' className='size-3.5' />
        </span>
        <div className='flex min-w-0 items-center justify-between gap-3'>
          <p className='text-sm text-muted-foreground'>{describe(log, teams)}</p>
          {!!map && (
            <Image
              role='presentation'
              {...landscapeImageProps(map)}
              sizes='48px'
              className={cn(
                'h-7 w-12 shrink-0 rounded-md object-cover ring-1 ring-white/10',
                isBan && 'opacity-60 grayscale'
              )}
            />
          )}
        </div>
      </motion.li>
    </>
  )
}

type SeriesChipProps = { order: number; name: string; map: MapData | undefined; isDecider: boolean }

function SeriesChip({ order, name, map, isDecider }: SeriesChipProps) {
  return (
    <div className='relative h-14 flex-1 overflow-hidden rounded-xl ring-1 ring-white/10'>
      {!!map && (
        <Image
          role='presentation'
          {...landscapeImageProps(map)}
          className='absolute inset-0 size-full object-cover'
        />
      )}
      <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10' />
      <div className='absolute inset-x-2.5 bottom-1.5 flex items-baseline gap-1.5 text-white'>
        <span className='text-sm font-black italic tabular-nums'>
          {String(order).padStart(2, '0')}
        </span>
        <span className='truncate text-xs font-semibold'>{name}</span>
        {isDecider && (
          <Crown aria-hidden weight='Filled' className='size-3 shrink-0 text-amber-300' />
        )}
      </div>
    </div>
  )
}

function describe(log: Log, teams: Teams): ReactNode {
  const team = (index: 1 | 2) => (
    <b className='font-semibold text-foreground'>{index === 1 ? teams.team1 : teams.team2}</b>
  )
  const map = (name: string) => <b className='font-semibold text-foreground'>{name}</b>

  switch (log.data.event) {
    case 'init':
      return <>Veto started with {log.data.maps.length} maps</>
    case 'ban':
      return (
        <>
          {team(log.data.by)} banned {map(log.data.map)}
        </>
      )
    case 'pick':
      return (
        <>
          {team(log.data.by)} picked {map(log.data.map)}
        </>
      )
    case 'decider':
      return <>{map(log.data.map)} is the decider</>
    case 'side-pick': {
      const isAttack = log.data.side === 'attack'
      return (
        <>
          {team(log.data.team)} chose{' '}
          <b className={cn('font-semibold', isAttack ? 'text-red-400' : 'text-sky-400')}>
            {isAttack ? 'attack' : 'defense'}
          </b>{' '}
          on {map(log.data.map)}
        </>
      )
    }
  }
}

function getMarker(log: Log) {
  switch (log.data.event) {
    case 'init':
      return { Icon: Notes, tone: 'bg-muted text-muted-foreground' }
    case 'ban':
      return { Icon: Judge, tone: 'bg-red-500/15 text-red-400' }
    case 'pick':
      return { Icon: Crosshairs, tone: 'bg-emerald-500/15 text-emerald-400' }
    case 'decider':
      return { Icon: Crown, tone: 'bg-amber-400/15 text-amber-300' }
    case 'side-pick':
      return log.data.side === 'attack'
        ? { Icon: Sword, tone: 'bg-red-500/15 text-red-400' }
        : { Icon: Shield2, tone: 'bg-sky-500/15 text-sky-400' }
  }
}
