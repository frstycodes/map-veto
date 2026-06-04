import { useLoaderData, useParams } from '@tanstack/react-router'
import { PickedMap, Team } from '@/utils/queries/veto-queries'
import { Image as ImageComp } from '@/components/image'
import { Loader2, Shield, Swords } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Portal } from '@radix-ui/react-portal'
import { cn } from '@/utils/tailwind-utils'
import { motion } from 'framer-motion'
import { ComponentProps } from 'react'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'

type Teams = {
  team1: string
  team2: string
}

type SidePickDialogProps = ComponentProps<typeof motion.div> & {
  map: PickedMap
  teams: Teams
}

const SIDE_OPTIONS = [
  {
    label: 'Attack',
    isAttack: true,
    icon: Swords,
    hoverStyles: 'hover:bg-red-500 hover:!shadow-red-500/40'
  },
  {
    label: 'Defend',
    isAttack: false,
    icon: Shield,
    hoverStyles: 'hover:bg-blue-500 hover:!shadow-blue-500/40'
  }
]

export function SidePickDialog(props: SidePickDialogProps) {
  const { id, token: teamId } = useParams({ from: '/$game/$id/$token/' })
  const { config } = useLoaderData({ from: '/$game' })
  const { vetoData } = useLoaderData({ from: '/$game/$id/$token/' })

  const mapData = config.maps.find((m) => m.name === props.map?.name)
  const imageURL = `/optimized/${mapData?.sidePickImage}`

  const isViewer = vetoData.myTeam === 0
  const isMyTurn = !isViewer && vetoData.myTeam === props.map.sidePickTurn
  const pickedByTeam = getPickedByTeam(props.map.by || 0, vetoData.myTeam, props.teams)

  const message = generateSidePickMessage(isMyTurn, isViewer, props.map, props.teams)

  const pickSideMutation = useMutation(
    orpc.veto.pickSide.mutationOptions({
      onError() {
        toast.error('Failed to pick side.')
      }
    })
  )

  return (
    <Portal>
      {!isMyTurn && <div className='fixed inset-0 z-50 cursor-not-allowed' />}
      <div className='fixed inset-0 z-20 grid place-items-center bg-black/40 backdrop-blur-sm'>
        <motion.div
          initial={{ skewX: -8 }}
          animate={{ skewX: -8, transition: { delay: 2 } }}
          layoutId={props.map!.name}
          className='relative z-20 flex h-80 w-[clamp(400px,80%,700px)] items-center justify-center gap-4 overflow-hidden rounded-lg bg-cover px-4 py-2'
        >
          <ImageComp
            src={imageURL}
            srcSet={{ 480: 480, 1024: 1024 }}
            role='presentantion'
            sizes='(max-width: 700px) 100vw, 600px'
            className='absolute size-full object-cover object-center'
          />
          <div className='absolute z-0 size-full bg-gradient-to-t from-black/50 from-30% to-black/0' />

          {/* Content */}
          <p className='z-10 flex items-center gap-1 text-lg font-medium text-white drop-shadow-md'>
            {message}
          </p>

          {SIDE_OPTIONS.map((option, idx) => (
            <button
              onClick={() => pickSideMutation.mutate({ id, teamId, attacker: option.isAttack })}
              key={idx}
              className={cn(
                'flex h-32 w-48 flex-col items-center justify-center gap-2 rounded-md border border-foreground/20 bg-white/10 text-white shadow-md backdrop-blur-lg transition-all hover:scale-110 hover:shadow-glow active:scale-105',
                option.hoverStyles
              )}
            >
              <option.icon className='size-16 stroke-white stroke-1' />
              <h3 className='text-sm font-bold'>{option.label}</h3>
            </button>
          ))}
          <div className='absolute bottom-0 left-0 flex w-full items-end justify-between px-4 py-1 text-white'>
            <h1 className='z-50 flex items-center gap-2 text-2xl font-bold'>
              <span className='skew-x-[8deg]'>
                <Loader2 className='size-7 animate-spin ease-in-out' />
              </span>
              {props.map?.name}
            </h1>
            <h1 className='text-xs'>
              Picked by <b className='text-sm'>{pickedByTeam || 'Decider'}</b>
            </h1>
          </div>
        </motion.div>
      </div>
    </Portal>
  )
}

function generateSidePickMessage(
  isMyTurn: boolean,
  isViewer: boolean,
  map: PickedMap,
  teams: Teams
): React.ReactNode {
  if (isMyTurn)
    return (
      <span>
        Pick a side for <b>{map.name}</b>.
      </span>
    )

  const team = map.sidePickTurn === 1 ? teams.team1 : teams.team2

  if (isViewer)
    return (
      <span>
        Waiting for <b>{team}</b> to pick a side.
      </span>
    )

  return `Waiting for opponent to pick a side.`
}

export function getPickedByTeam(pickedBy: 1 | 2 | 0, myTeam: 1 | 2 | 0, teams: Teams) {
  switch (pickedBy) {
    // 0 doesn't represent Viewer here, for map picked 0 represents Decider
    case 0:
      return 'Decider'
    case myTeam:
      return 'You'
    case Team.Team1:
      return teams.team1 || `Team ${pickedBy}`
    case Team.Team2:
      return teams.team2 || `Team ${pickedBy}`
    default:
      return `Team ${pickedBy}`
  }
}
