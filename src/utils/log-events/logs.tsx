import { Download, Gavel, MousePointerClick, NotepadText, Scale, Shield, Sword } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReactNode, useRef } from 'react'
import { cn } from '../tailwind-utils'
import { motion } from 'framer-motion'
import convertToPng from '../html2png'

const enum LogEvent {
  Init = 'init',
  Ban = 'ban',
  Pick = 'pick',
  SidePick = 'side-pick',
  Decider = 'decider'
}

const enum Side {
  Attack = 'attack',
  Defend = 'defend'
}

export type Log = {
  time: string
  data: VetoInitializationEvent | MapActionEvent | DeciderEvent | SidePickEvent
}

type VetoInitializationEvent = {
  event: LogEvent.Init
  maps: string[]
}

type MapActionEvent = {
  event: LogEvent.Ban | LogEvent.Pick
  map: string
  by: 1 | 2
}

type DeciderEvent = {
  event: LogEvent.Decider
  map: string
}

type SidePickEvent = {
  event: LogEvent.SidePick
  map: string
  side: Side
  team: 1 | 2
}

export function logParser(log: Log, _teams: { team1: string; team2: string }): [Date, ReactNode] {
  const time = new Date(log.time)

  const teams = ['', _teams.team1, _teams.team2]

  let message: ReactNode

  switch (log.data.event) {
    case LogEvent.Init: {
      const maps = log.data.maps
      message = (
        <>
          <p>
            <NotepadText className='inline size-4 text-yellow-500' /> Veto was initialized with with maps:
            {maps.map((map, i) => {
              return (
                <span key={i}>
                  {' '}
                  {map}
                  {i + 1 !== maps.length && ','}
                </span>
              )
            })}
          </p>
          <br />
          <p className='text-muted-foreground'>// Ban Start</p>
        </>
      )
      break
    }
    case LogEvent.Ban:
      message = (
        <p>
          <Gavel className='inline size-4 text-rose-500' /> Team <b>{teams[log.data.by]}</b> banned
          <b> {log.data.map}</b>.
        </p>
      )
      break
    case LogEvent.Pick:
      message = (
        <p>
          <MousePointerClick className='inline size-4 text-emerald-500' /> Team <b>{teams[log.data.by]}</b> picked
          <b> {log.data.map}</b>.
        </p>
      )
      break
    case LogEvent.Decider:
      message = (
        <>
          <p>
            <Scale className='inline size-4 text-yellow-500' /> <b>{log.data.map}</b> was selected as the decider.
          </p>
          <br />
          <p className='text-muted-foreground'>// Side Pick Start</p>
        </>
      )
      break
    case LogEvent.SidePick: {
      const SideIcon = log.data.side === Side.Attack ? Sword : Shield
      const sideColor = log.data.side === Side.Attack ? 'text-rose-500' : 'text-blue-500'
      message = (
        <p>
          <SideIcon className={cn('inline size-4', sideColor)} /> Team <b>{teams[log.data.team]}</b> chose to{' '}
          <b>{log.data.side}</b> in <b>{log.data.map}</b>.
        </p>
      )
      break
    }
  }
  return [time, message] as const
}

type LogsProps = {
  logs: Log[]
  game: string
  teams: { team1: string; team2: string }
}

export function Logs(props: LogsProps) {
  const today = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date())
  const fileName = `${props.game} ${props.teams.team1} vs ${props.teams.team2} ${today}`
  const ref = useRef<HTMLDivElement>(null)

  const logsULVariant = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.03
      }
    }
  }
  const logVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    }
  }
  return (
    <div className='pb-4'>
      <div ref={ref} className='relative bg-background p-4 font-sans'>
        <div>
          <p className='text-xs font-bold uppercase text-primary'>{props.game}</p>
          <p className='captialize text-2xl font-bold italic'>
            <span className='uppercase'>{props.teams.team1} </span>
            <span className='text-lg'>vs</span>
            <span className='uppercase'> {props.teams.team2}</span>
            <span className='text-xs font-semibold'> Veto Logs</span>
          </p>
        </div>
        <hr className='mt-2' />
        <motion.ul variants={logsULVariant} initial='hidden' animate='visible' className='space-y-2 pb-8 pt-4'>
          {props.logs.map((log, i) => {
            const [time, message] = logParser(log, props.teams)
            return (
              <motion.li
                key={i}
                variants={logVariants}
                style={{ transformOrigin: 'left' }}
                className='flex items-baseline gap-2'
              >
                <p className='whitespace-nowrap font-mono text-xs text-muted-foreground'>
                  {time.toLocaleTimeString()}:{' '}
                </p>
                <p className='font-mono text-sm'>{message}</p>
              </motion.li>
            )
          })}
        </motion.ul>
        <div className='flex justify-between text-xs text-muted-foreground'>
          <p className='bottom-2 left-2 font-mono'>Date: {today}</p>
          <p className='bottom-2 left-2 font-mono'>
            Created using{' '}
            <a className='text-semibold text-foreground underline' href={window.location.origin} target='_blank'>
              {window.location.origin.replace(/http(s)?:\/\//, '')}
            </a>
          </p>
        </div>
      </div>
      <Button
        onClick={() =>
          convertToPng(ref, {
            name: fileName,
            scale: 4
          })
        }
        className='ml-3 h-8 gap-2 rounded-lg text-xs'
      >
        <Download className='size-4' />
        Download Logs
      </Button>
    </div>
  )
}
