import {
  ClientType,
  getInitialVetoState,
  getVeto,
  PickedMap,
  VetoPhase,
  VetoResponse
} from '@/utils/queries/veto-queries'
import { AnimatePresence, motion, MotionValue, useMotionTemplate, useSpring, useTransform } from 'framer-motion'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnimatingCard, AnimatingCardContainer } from '@/components/animating-cards'
import { Hammer, Loader2, Shield, Swords, SwordsIcon } from 'lucide-react'
import { pickSide, sendAction } from '@/utils/mutations/veto-mutations'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { ComponentProps, useEffect, useMemo, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useVetoPoller } from '@/hooks/queries/use-veto-poller'
import { Route as GameRoute } from '@/routes/$game/_layout'
import { Image as ImageComp } from '@/components/image'
import { StageAction } from '@/types/ban-order.types'
import { SPRING_OPTS } from '@/config/motion-config'
import { MapData } from '@/types/game-config.types'
import { useMutation } from '@tanstack/react-query'
import { useRerender } from '@/hooks/use-rerender'
import { Button } from '@/components/ui/button'
import { Dialog } from '@radix-ui/react-dialog'
import { Portal } from '@radix-ui/react-portal'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/tailwind-utils'
import { sleep, Time } from '@/utils/time'
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

enum AnimationState {
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
        await sleep(Time.Second * 1)
        setIsSidePickAnimating(false)
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
        toast.error('Failed to send action')
        throw error
      }
    }
  })

  const isViewer = vetoData.clientType === ClientType.Viewer
  const isDialogOpen_teamInit = !isViewer && (!pollQuery.data?.team1 || !pollQuery.data?.team2)

  /*
    Using this variable to conditionally render the MapsList(AnimatingCardsContainer) which takes up space and
    only using isChoosingSides would be enough but since it is set to true before the animation completes
    so we need to check if the decider animation is finished, for which we will check if the 
    deciderMap_forAnimationOnly is empty string.
  */
  const isChoosingSides = vetoState.phase === VetoPhase.ChooseSides

  /* 
  Determining the current side choice stage by finding the first
  selected map where attacker is not set. 
*/

  useEffect(() => {
    if (isChoosingSides) {
      setDeciderAnimationState(AnimationState.Ended)
    }
  }, [])

  const currentSideChoiceMap =
    (deciderAnimationState == AnimationState.Ended && vetoState.selected?.find((map) => !map.attacker)) || null

  return (
    <CenteredPageLayout className='relative w-[clamp(300px,80%,600px)]'>
      {isViewer && <div className='absolute inset-0 scale-110 cursor-not-allowed' style={{ zIndex: 9999 }} />}
      {/* <div className='fixed bottom-4 left-4'>
        <div className='flex max-w-[30rem] flex-col gap-2 text-xs text-muted-foreground'>
          {vetoState.logs?.map((log, idx) => {
            let color = 'text-emerald-500'

            if (log.event?.includes('banned')) {
              color = 'text-red-500'
            }
            if (log.event?.includes('picked')) {
              color = 'text-emerald-500'
            }
            if (log.event?.includes('decider')) {
              color = 'text-yellow-500'
            }

            const logTime = new Date(log.time)
            return (
              <motion.div
                layout
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className='flex gap-2'
              >
                <p className='opacity-50'>{logTime.toLocaleTimeString()}</p>:<p className={color}>{log.event}</p>
              </motion.div>
            )
          })}
        </div>
      </div> */}
      <TeamInitDialog open={isDialogOpen_teamInit} />
      <motion.h1 className='flex w-full items-center justify-between gap-2 py-4 text-2xl font-bold italic'>
        <div className='flex-1'>
          <TeamDetail name={vetoState.team1} action={vetoState.type as BanOrPick} showIndicator={vetoState.team == 1} />
        </div>
        <p className='text-sm'>vs</p>
        <div className='flex flex-1 justify-end'>
          <TeamDetail
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

      <motion.div className='space-y-4 py-4'>
        <motion.div layout className='-z-10 flex gap-1'>
          {!vetoState.selected?.length && (
            <motion.div className='text-medium w-full italic text-muted-foreground'>No Maps selected</motion.div>
          )}
          <AnimatePresence mode='popLayout'>
            <motion.div layout className='flex w-full gap-1'>
              {vetoState.selected?.map((map) => {
                const mapData = config.maps.find((m) => m.name === map.name)!

                return (
                  <SelectedMapCard
                    map={mapData}
                    pickedBy={map.by}
                    attacker={map.attacker}
                    key={map.name}
                    className={cn(isChoosingSides && 'h-60')}
                  />
                )
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
      {!!currentSideChoiceMap && !isSidePickAnimating && <SidePickDialog map={currentSideChoiceMap!} />}
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
}

function SidePickDialog(props: SidePickDialogProps) {
  const { id, token: teamId } = Route.useParams()
  const { config } = GameRoute.useLoaderData()
  const mapData = config.maps.find((m) => m.name === props.map?.name)
  const imageURL = `/optimized/${mapData?.images[1]}`
  const { vetoData } = Route.useLoaderData()

  const isMyTurn = (vetoData.clientType === 1 || vetoData.clientType === 2) && vetoData.clientType !== props.map.by

  const pickedByTeam = useMemo(() => getPickedByTeam(props.map.by || 0, vetoData), [props.map, vetoData])

  const message = isMyTurn ? 'Waiting for you to pick a side.' : <>Waiting for opponent to pick a side.</>

  const pickSideMutation = useMutation({
    mutationFn: async (attacker: boolean) => {
      return await pickSide(id, teamId, attacker)
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

function getPickedByTeam(picked: 0 | 1 | 2, vetoData: VetoResponse) {
  const myTeam = vetoData.clientType
  if (picked == myTeam) {
    return 'You'
  }
  switch (picked) {
    case 1:
      return vetoData.team1.name || 'Team 1'
    case 2:
      return vetoData.team2.name || 'Team 2'
    default:
      return '' // which means decider
  }
}

type SelectedMapCardProps = ComponentProps<typeof motion.div> & {
  map: MapData
  pickedBy?: 0 | 1 | 2
  attacker?: 1 | 2
}
function SelectedMapCard({ map, attacker, pickedBy, ...props }: SelectedMapCardProps) {
  const { vetoData } = Route.useLoaderData()
  const pickedByTeam = useMemo(() => getPickedByTeam(pickedBy || 0, vetoData), [pickedBy, vetoData])

  const mapUrl = `/optimized/${map?.images[3]}`

  return (
    <motion.div
      layoutId={map.name}
      {...props}
      initial={{ skewX: -8 }}
      animate={{ skewX: -8 }}
      className={cn(
        'flex h-24 min-w-24 max-w-80 flex-1 cursor-pointer items-center overflow-hidden rounded-lg bg-cover bg-center shadow-lg',
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
        className='absolute w-full'
      />

      {!!attacker && (
        <div
          className={cn(
            'absolute top-0 flex h-10 w-full justify-between bg-gradient-to-b from-black/70 to-black/0 px-2 py-2',
            attacker === 2 && 'flex-row-reverse'
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

type TeamDetailProps = ComponentProps<'p'> & {
  name: string
  action: BanOrPick
  showIndicator: boolean
}

function TeamDetail({ showIndicator, action, name, ...props }: TeamDetailProps) {
  return (
    <p {...props} className={cn('relative z-10 flex w-fit items-center gap-2', props.className)}>
      {name}
      {showIndicator && <VetoTurnIndicator vetoType={action} />}
    </p>
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

function TeamInitDialog({ open }: { open: boolean }) {
  const [teamName, setTeamName] = useState('')
  const { id, token } = Route.useParams()

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, teamId, name }: { id: string; teamId: string; name: string }) => {
      if (name === '') {
        throw new Error('Team name cannot be empty')
      }
      const res = await fetch(`/api/veto/${id}/team/${teamId}`, {
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

function preloadMapImages(maps: string[]) {
  for (const map of maps) {
    const splash = new Image()
    const tall = new Image()
    splash.src = `/optimized/${map}-splash-1024w.webp`
    tall.src = `/optimized/${map}-tall-480w.webp`
  }
}
