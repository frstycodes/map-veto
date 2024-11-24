import { AnimatePresence, motion, MotionValue, useMotionTemplate, useSpring, useTransform } from 'framer-motion'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getInitialVetoState, getVeto, PickedMap, Team, VetoPhase } from '@/utils/queries/veto-queries'
import { Hammer, Loader2, NotebookText, Shield, Swords, SwordsIcon } from 'lucide-react'
import { AnimatingCard, AnimatingCardContainer } from '@/components/animating-cards'
import { playMapsHoverSound } from '@/assets/sfx/maps-hover/maps-hover.sfx'
import { pickSide, sendAction } from '@/utils/mutations/veto-mutations'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useVetoPoller } from '@/hooks/queries/use-veto-poller'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Route as GameRoute } from '@/routes/$game/_layout'
import { ComponentProps, useEffect, useState } from 'react'
import { playErrorSound } from '@/assets/sfx/error/error'
import { Image as ImageComp } from '@/components/image'
import { StageAction } from '@/types/ban-order.types'
import { SPRING_OPTS } from '@/config/motion-config'
import { MapData } from '@/types/game-config.types'
import { Log, Logs } from '@/utils/log-events/logs'
import { useRerender } from '@/hooks/use-rerender'
import { Button } from '@/components/ui/button'
import { Dialog } from '@radix-ui/react-dialog'
import { Portal } from '@radix-ui/react-portal'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/tailwind-utils'
import { sleep, Time } from '@/utils/time'
import { api } from '@/utils/helpers'
import { toast } from 'sonner'

export const Route = createFileRoute('/$game/_layout/$id/_layout/$token')({
  loader: async ({ params }) => {
    const statePromise = getInitialVetoState(params.id)
    const dataPromise = getVeto(params.id, params.token)
    const [vetoState, vetoData] = await Promise.all([statePromise, dataPromise])
    return { vetoState, vetoData }
  },
  component: VetoPage,
  onError: () => {
    throw redirect({ to: '/' })
  }
})

const enum AnimationState {
  NotStarted,
  Started,
  Ended
}

type BanOrPick = StageAction.Ban | StageAction.Pick
function VetoPage() {
  const rerender = useRerender()
  const { config } = GameRoute.useLoaderData()
  const { id, token } = Route.useParams()
  const { vetoState: loader_vetoState, vetoData } = Route.useLoaderData()

  /*
    This is only used for decider animation. We have a interceptor in the veto-poller 
    to check whether the current map is decider and if so, we will set the decider state
    to the current map for a short period of time to animate, then reset it to '' since 
    the decider map will be added to the selected map list this should work fine.
  */

  const [deciderMap_forAnimationOnly, setdeciderMap_forAnimationOnly] = useState<PickedMap | null>(null)
  const [deciderAnimationState, setDeciderAnimationState] = useState(AnimationState.NotStarted)
  const [isSidePickAnimating, setIsSidePickAnimating] = useState(false)

  const animateDecider = async (decider: PickedMap) => {
    setdeciderMap_forAnimationOnly(decider)
    setDeciderAnimationState(AnimationState.Started)

    await sleep(Time.Second * 2)
    setdeciderMap_forAnimationOnly(null)

    // Don't wait for this to finish since we want the map to be added to the selected maps list
    sleep(Time.Second).then(() => setDeciderAnimationState(AnimationState.Ended))
  }

  const pollQuery = useVetoPoller(id, token, {
    initialData: loader_vetoState,

    // The interceptor responsible for checking the decider map.
    async afterFetchSync(data) {
      // Preload the last rounds images
      const dirtyMapCount = (data.selected?.length || 0) + (data.banned?.length || 0)
      if (vetoData.maps.length - dirtyMapCount == vetoData.rounds) {
        const dirtyMaps = vetoData.maps.filter((map) => !data.banned?.some((m) => m.name === map))
        preloadMapImages(dirtyMaps)
      }

      // decider animation if required number of maps are selected and phase just changed
      const isDecider = data.selected?.length === vetoData.rounds && vetoState.phase != data.phase
      if (isDecider) {
        const decider = data.selected?.at(-1)
        if (!decider) return
        await animateDecider(decider)
        return
      }

      if (data.phase === VetoPhase.ChooseSides) {
        setIsSidePickAnimating(true)
        sleep(Time.Second * 2).then(() => setIsSidePickAnimating(false))
      }
    }
  })

  const stage = vetoData.stages[pollQuery.data?.currentStage ?? 0]
  const vetoState = {
    ...pollQuery.data,
    team1: pollQuery.data?.team1 || 'Team 1',
    team2: pollQuery.data?.team2 || 'Team 2',
    type: stage.type,
    team: stage.team
  }

  const selectMapMutation = useMutation({
    mutationFn: async (map: string) => {
      const currentMapsState = {
        selected: [...(vetoState.selected ?? [])],
        banned: [...(vetoState.banned ?? [])]
      }

      try {
        // Optimistically update the selected or banned maps
        if (vetoState.type === StageAction.Ban) {
          currentMapsState.banned.push({ name: map })
        } else {
          currentMapsState.selected.push({ name: map })
        }
        rerender()
        await sendAction(id, token, map)
      } catch (error) {
        // If the action fails, revert the optimistic update
        vetoState.selected = currentMapsState.selected
        vetoState.banned = currentMapsState.banned
        rerender()
        playErrorSound()
        toast.error('Failed to send action')
        throw error
      }
    }
  })

  const isViewer = vetoData.myTeam === 0
  const isDialogOpen_teamInit = !isViewer && (!pollQuery.data?.team1 || !pollQuery.data?.team2)

  /*
    Using this variable(isChoosingSides) to conditionally render the MapsList(AnimatingCardsContainer) which takes up space and
    only using isChoosingSides would be enough but since it is set to true before the animation completes
    so we need to check if the decider animation is finished, for which we will check if the 
    deciderMap_forAnimationOnly is empty string.
  */
  const isChoosingSides = vetoState.phase === VetoPhase.ChooseSides

  useEffect(() => {
    if (isChoosingSides) {
      setDeciderAnimationState(AnimationState.Ended)
    }
    // Not including the isChoosingSides because we want this to be fired only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 
    Determining the current side choice stage by finding the first
    selected map where attacker is not set. 
  */
  const currentSideChoiceMap =
    (deciderAnimationState == AnimationState.Ended && vetoState.selected?.find((map) => !map.attacker)) || null

  const logsQuery = useQuery({
    queryKey: ['veto-logs', id],
    queryFn: async () => {
      const res = await api(`/api/veto/${id}/logs`)
      if (!res.ok) throw new Error(res.statusText)
      return await res.json()
    },
    enabled: vetoState.ended
  })

  return (
    <CenteredPageLayout className='relative w-[clamp(300px,80%,600px)]'>
      {isViewer && <div className='absolute inset-0 scale-110 cursor-not-allowed' style={{ zIndex: 9999 }} />}
      <TeamInitDialog open={isDialogOpen_teamInit} />
      <motion.h1 className='flex w-full items-center justify-between gap-2 py-4 text-2xl font-bold italic'>
        <div className='flex-1'>
          <ScoreBoardTeamDetail
            name={vetoState.team1}
            action={vetoState.type as BanOrPick}
            showIndicator={vetoState.team == 1}
          />
        </div>
        <p className='text-sm'>vs</p>
        <div className='flex flex-1 justify-end'>
          <ScoreBoardTeamDetail
            className='flex-row-reverse'
            name={vetoState.team2}
            action={vetoState.type as BanOrPick}
            showIndicator={vetoState.team == 2}
          />
        </div>
      </motion.h1>

      <div className='flex gap-2'>
        <AnimatePresence mode='popLayout'>
          {!isChoosingSides && (
            <AnimatingCardContainer
              exit={{ height: 0, padding: 0 }}
              className={cn('!w-full py-4')}
              cardWidth={70}
              gap={4}
            >
              {vetoData.maps.map((map, idx) => {
                const isBanned = vetoState.banned?.some((m) => m.name == map)
                const isSelected = vetoState.selected?.some((m) => m.name === map)
                if (isBanned || isSelected) return null

                /*
              After the decider map animation starts, we will set the isChoosingSides state to true
              and not render other maps which are eliminated and only render the decider map.
              */
                if (deciderAnimationState == AnimationState.Started && deciderMap_forAnimationOnly?.name !== map)
                  return null

                const mapData = config.maps.find((m) => m.name === map)
                return (
                  <AnimatingCard
                    onMouseEnter={() => playMapsHoverSound(1)}
                    holdFor={Time.MS * 300}
                    onHoldSuccess={() => selectMapMutation.mutate(map)}
                    layoutId={map}
                    key={idx}
                    className='h-60 cursor-pointer overflow-hidden rounded-lg'
                    render={({ distance }) => <AnimatingMapCardContents distance={distance} map={mapData!} />}
                  />
                )
              })}
            </AnimatingCardContainer>
          )}

          {deciderMap_forAnimationOnly && (
            <motion.div
              exit={{ height: 0 }}
              className='z-[99999] inline-flex h-60 -skew-x-[8deg] flex-col justify-center gap-1'
            >
              <motion.div
                initial={{ x: -200, scale: 0.7, opacity: 0 }}
                animate={{ x: 0, scale: 1, opacity: 1 }}
                exit={{ x: -200, scale: 0, opacity: 0 }}
                className='bg-primary px-4 text-2xl font-bold text-primary-foreground'
              >
                {deciderMap_forAnimationOnly.name}
              </motion.div>
              <motion.p
                initial={{ x: -200, scale: 0.7, opacity: 0 }}
                animate={{ x: 0, scale: 1, opacity: 1, transition: { delay: 0.2 } }}
                exit={{ x: -200, scale: 0, opacity: 0 }}
                className='text-md bg-primary px-4 font-medium text-primary-foreground'
              >
                Decider
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.div layout className='-z-10 flex gap-1 py-4'>
        <AnimatePresence mode='popLayout'>
          <motion.div layout className='flex w-full gap-1'>
            {vetoState.selected?.map((map) => (
              <SelectedMapCard
                key={map.name}
                map={map}
                teams={{
                  team1: vetoState.team1,
                  team2: vetoState.team2
                }}
                className={cn(isChoosingSides && 'h-60')}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      {logsQuery.data && (
        <div className='flex flex-col gap-1 py-2'>
          <LogsDialog
            logs={logsQuery.data}
            teams={{
              team1: vetoState.team1,
              team2: vetoState.team2
            }}
          />
        </div>
      )}
      <Portal>
        <motion.div className='fixed bottom-1 left-2 flex -skew-x-[8deg] gap-2 py-2'>
          {vetoState.banned?.map((map) => {
            return (
              <motion.h1
                layoutId={map.name}
                transition={{ type: 'spring', duration: 0.5 }}
                className='rounded-lg border-2 border-destructive bg-destructive/20 px-3 py-1 text-sm backdrop-blur-md'
                key={map.name}
              >
                {map.name}
              </motion.h1>
            )
          })}
        </motion.div>
      </Portal>
      {!!currentSideChoiceMap && !isSidePickAnimating && (
        <SidePickDialog teams={{ team1: vetoState.team1, team2: vetoState.team2 }} map={currentSideChoiceMap!} />
      )}
    </CenteredPageLayout>
  )
}

const FIGHT_OPTIONS = [
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

type SidePickDialogProps = ComponentProps<typeof motion.div> & {
  map: PickedMap
  teams: {
    team1: string
    team2: string
  }
}

function SidePickDialog(props: SidePickDialogProps) {
  const { id, token: teamId } = Route.useParams()
  const { config } = GameRoute.useLoaderData()
  const mapData = config.maps.find((m) => m.name === props.map?.name)
  const imageURL = `/optimized/${mapData?.images[1] ?? mapData?.images[0]}`
  const { vetoData } = Route.useLoaderData()

  const isViewer = vetoData.myTeam === 0
  const isMyTurn = !isViewer && vetoData.myTeam == props.map.sidePickTurn

  const pickedByTeam = getPickedByTeam(props.map.by || 0, vetoData.myTeam, props.teams)

  const message = (() => {
    if (isMyTurn)
      return (
        <p>
          Pick a side for <b>{props.map.name}</b>.
        </p>
      )

    const team = props.map.sidePickTurn === 1 ? props.teams.team1 : props.teams.team2

    if (isViewer)
      return (
        <p>
          Waiting for <b>{team}</b> to pick a side.
        </p>
      )

    return `Waiting for opponent to pick a side.`
  })()

  const pickSideMutation = useMutation({
    mutationFn: async (isAttacker: boolean) => {
      return pickSide(id, teamId, isAttacker)
    },
    onError() {
      playErrorSound()
      toast.error('Failed to pick side.')
    }
  })

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
            setSizes={[640, 1024]}
            role='presentantion'
            sizes='(max-width: 700px) 100vw, 600px'
            className='absolute size-full object-cover object-center'
          />
          <div className='absolute z-0 size-full bg-gradient-to-t from-black/50 from-30% to-black/0' />

          {/*Content */}
          <p className='z-10 flex items-center gap-1 text-lg font-medium text-white drop-shadow-md'>{message}</p>

          {FIGHT_OPTIONS.map((option, idx) => (
            <button
              onClick={() => pickSideMutation.mutate(option.isAttack)}
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

function AnimatingMapCardContents({ distance, map }: { distance: MotionValue<number>; map: MapData }) {
  const fontSizeSync = useTransform(distance, [0, 1], [1, 0.8])
  const fontSize = useSpring(fontSizeSync, SPRING_OPTS)
  const { vetoData } = Route.useLoaderData()
  const imageURL = `/optimized/${map?.images[0]}`
  return (
    <div className='relative flex h-full w-full items-center justify-center bg-cover bg-center transition-all'>
      <ImageComp
        role='presentation'
        src={imageURL}
        setSizes={[640, { imageSize: 1024, screenWidth: 900 }]}
        sizes='300px'
        className='absolute z-10 h-full w-full object-cover object-center transition-all'
      />
      {vetoData.game == 'cs2' && <div className='absolute inset-0 z-10 bg-black/40' />}
      <div className='z-20 grid h-full w-full place-items-center'>
        <motion.h1
          style={{ fontSize: useMotionTemplate`${fontSize}rem` }}
          className='relative -rotate-90 font-bold text-white'
        >
          <div className='absolute -z-10 h-full w-full bg-black blur-3xl' />
          {map.name}
        </motion.h1>
      </div>
    </div>
  )
}

type SelectedMapCardProps = ComponentProps<typeof motion.div> & {
  map: PickedMap
  teams: { team1: string; team2: string }
}
function SelectedMapCard({ map, teams, ...props }: SelectedMapCardProps) {
  const { config } = GameRoute.useLoaderData()
  const { vetoData } = Route.useLoaderData()

  const mapData = config.maps.find((m) => m.name == map.name)

  const pickedByTeam = getPickedByTeam(map.by || 0, vetoData.myTeam, teams)

  const mapUrl = `/optimized/${mapData?.images[3] ?? mapData?.images[0]}`

  return (
    <motion.div
      layoutId={map.name}
      {...props}
      initial={{ skewX: -8 }}
      animate={{ skewX: -8 }}
      className={cn(
        'relative flex h-24 min-w-24 max-w-80 flex-1 cursor-pointer items-center overflow-hidden rounded-lg bg-cover bg-center shadow-lg',
        props.className
      )}
      transition={{
        type: 'spring',
        duration: 0.5,
        ...props.transition
      }}
    >
      <ImageComp
        src={mapUrl}
        transition={{
          type: 'spring',
          duration: 0.5
        }}
        setSizes={[480]}
        className='absolute size-full object-cover object-center'
      />

      {!!map.attacker && (
        <div
          className={cn(
            'absolute top-0 flex h-10 w-full justify-between bg-gradient-to-b from-black/70 to-black/0 px-2 py-2 animate-in fade-in-0 slide-in-from-top-2',
            map.attacker === 2 && 'flex-row-reverse'
          )}
        >
          <SwordsIcon className='size-5 fill-white/40 text-white drop-shadow-md' />
          <Shield className='size-5 fill-white/40 text-white drop-shadow-md' />
        </div>
      )}

      <motion.div className='absolute bottom-0 left-0 flex h-fit items-baseline gap-2 bg-primary px-4 text-primary-foreground drop-shadow-lg'>
        <p className='text-sm font-bold'>{map.name}</p>
        {pickedByTeam && <p className='text-xs font-medium'> - {pickedByTeam}</p>}
      </motion.div>
    </motion.div>
  )
}

type ScoreBoardTeamDetailProps = ComponentProps<'p'> & {
  name: string
  action: BanOrPick
  showIndicator: boolean
}

function ScoreBoardTeamDetail({ showIndicator, action, name, ...props }: ScoreBoardTeamDetailProps) {
  return (
    <p {...props} className={cn('relative z-10 flex w-fit items-center gap-2', props.className)}>
      {name}
      {showIndicator && <VetoTurnIndicator vetoType={action} />}
    </p>
  )
}

function TeamInitDialog({ open }: { open: boolean }) {
  const [teamName, setTeamName] = useState('')
  const { id, token } = Route.useParams()

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, teamId, name }: { id: string; teamId: string; name: string }) => {
      if (name === '') {
        throw new Error('Team name cannot be empty')
      }
      const res = await api(`/api/veto/${id}/team/${teamId}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error(res.statusText)
    },
    onSuccess() {
      toast.success('Successfully updated team name')
      setTeamName('')
    },
    onError() {
      playErrorSound()
      toast.error('Failed to update team name')
    }
  })

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a name for your team</DialogTitle>
        </DialogHeader>
        <form
          className='w-full space-y-4'
          onSubmit={(e) => {
            e.preventDefault()
            updateTeamMutation.mutate({
              id,
              teamId: token,
              name: teamName.trim()
            })
          }}
        >
          <div className='flex items-center gap-2'>
            <Input placeholder='My Team' value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <Button loading={updateTeamMutation.isPending} type='submit' className='float-right rounded-lg'>
              Submit
            </Button>
          </div>
        </form>
        <DialogFooter className='text-sm text-muted-foreground'>
          Veto will only start when both teams have submitted their names.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LogsDialogProps = {
  logs: Log[]
  teams: {
    team1: string
    team2: string
  }
}

function LogsDialog(props: LogsDialogProps) {
  const { vetoData } = Route.useLoaderData()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' className='gap-2 rounded-lg'>
          <NotebookText className='size-5' /> Logs are available: View
        </Button>
      </DialogTrigger>
      <DialogContent className='p-0'>
        <Logs logs={props.logs} game={vetoData.game} teams={{ team1: props.teams.team1, team2: props.teams.team2 }} />
      </DialogContent>
    </Dialog>
  )
}

type VetoTurnIndicatorProps = ComponentProps<typeof Badge> & {
  vetoType: StageAction.Ban | StageAction.Pick
}
function VetoTurnIndicator({ vetoType, ...props }: VetoTurnIndicatorProps) {
  const ActionIcon = vetoType === StageAction.Ban ? Hammer : Swords
  const actionStyle = vetoType === StageAction.Ban ? 'text-red-500' : 'text-emerald-500'
  return <ActionIcon className={cn('h-5 w-5', actionStyle, props.className)} />
}

function getPickedByTeam(pickedBy: Team | 0, myTeam: Team | 0, teams: { team1: string; team2: string }) {
  const team = pickedBy === Team.Team1 ? teams.team1 : teams.team2

  // 0 doesn't represent Viewer here, for map picked 0 represents Decider
  if (pickedBy === 0) return 'Decider'
  if (pickedBy === myTeam) return 'You'

  return team || `Team ${pickedBy}`
}

function preloadMapImages(maps: string[]) {
  for (const map of maps) {
    const splash = new Image()
    const tall = new Image()
    splash.src = `/optimized/${map}-splash-1024w.webp`
    tall.src = `/optimized/${map}-tall-480w.webp`
  }
}
