import { AnimatingCard, AnimatingCardContainer } from '@/components/animating-cards'
import { createFileRoute, redirect, useLoaderData } from '@tanstack/react-router'
import { playMapsHoverSound } from '@/assets/sfx/maps-hover/maps-hover.sfx'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { sendAction } from '@/utils/mutations/veto-mutations'
import { useMutation } from '@tanstack/react-query'
import { useVetoState } from '@/hooks/queries/use-veto-state'
import { playErrorSound } from '@/assets/sfx/error/error'
import { VetoPhase } from '@/utils/queries/veto-queries'
import { AnimatePresence, motion } from 'framer-motion'
import { useRerender } from '@/hooks/use-rerender'
import { Portal } from '@radix-ui/react-portal'
import { cn } from '@/utils/tailwind-utils'
import { Time } from '@/utils/time'
import { getVetoSocket } from '@/lib/veto-socket'
import { useEffect } from 'react'
import { toast } from 'sonner'

import {
  AnimatingMapCardContents,
  AnimationState,
  LogsDialog,
  preloadMapImages,
  ScoreBoardTeamDetail,
  SelectedMapCard,
  SidePickDialog,
  TeamInitDialog,
  useDeciderAnimation,
  useSidePickAnimation
} from './-components'

export const Route = createFileRoute('/$game/$id/$token/')({
  loader: async ({ params }) => {
    const socket = getVetoSocket(params.id)
    const [vetoState, vetoData] = await Promise.all([
      socket.send('veto:state', undefined),
      socket.send('veto:get', { token: params.token })
    ])
    return { vetoState, vetoData }
  },
  component: VetoPage,
  onError: () => {
    throw redirect({ to: '/' })
  }
})

type BanOrPick = 'ban' | 'pick'

function VetoPage() {
  const rerender = useRerender()
  const { config } = useLoaderData({ from: '/$game' })
  const { id, token } = Route.useParams()
  const { vetoState: loader_vetoState, vetoData } = Route.useLoaderData()

  const {
    deciderMap: deciderMap_forAnimationOnly,
    animationState: deciderAnimationState,
    animateDecider
  } = useDeciderAnimation()

  const { isSidePickAnimating, animateSidePick } = useSidePickAnimation()

  const liveState = useVetoState(id, {
    initialData: loader_vetoState,
    async onData(data) {
      // Preload the last rounds images
      const dirtyMapCount = (data.selected?.length || 0) + (data.banned?.length || 0)
      if (vetoData.maps.length - dirtyMapCount === vetoData.rounds) {
        const dirtyMaps = vetoData.maps
          .filter((map) => !data.banned?.some((m) => m.name === map))
          .map((map) => {
            const mapData = config.maps.find((m) => m.name === map)
            return mapData!
          })
        preloadMapImages(dirtyMaps)
      }

      // decider animation if required number of maps are selected and phase just changed
      const isDecider = data.selected?.length === vetoData.rounds && vetoState.phase !== data.phase
      if (isDecider) {
        const decider = data.selected?.at(-1)
        if (!decider) return
        await animateDecider(decider)
        return
      }

      // side pick animation
      if (data.phase === VetoPhase.ChooseSides && vetoState.phase !== data.phase) {
        await animateSidePick()
      }
    }
  })

  const stage = vetoData.stages[liveState.data?.currentStage ?? 0]
  const vetoState = {
    ...liveState.data,
    team1: liveState.data?.team1 || 'Team 1',
    team2: liveState.data?.team2 || 'Team 2',
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
        if (vetoState.type === 'ban') {
          currentMapsState.banned.push({ name: map, by: 0 })
        } else {
          currentMapsState.selected.push({ name: map, by: 0 })
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
  const isDialogOpen_teamInit = !isViewer && (!liveState.data?.team1 || !liveState.data?.team2)
  const isChoosingSides = vetoState.phase === VetoPhase.ChooseSides

  useEffect(() => {
    if (isChoosingSides) {
      // Set decider animation as ended when we're in choose sides phase
      // to ensure proper UI state
    }
    // Not including isChoosingSides as a dependency since we want this effect to run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
    Determining the current side choice map by finding the first
    selected map where attacker is not set.
  */
  const currentSideChoiceMap =
    (deciderAnimationState === AnimationState.Ended &&
      vetoState.selected?.find((map) => !map.attacker)) ||
    null

  return (
    <CenteredPageLayout className='relative w-[clamp(300px,80%,600px)]'>
      {isViewer && (
        <div className='absolute inset-0 scale-110 cursor-not-allowed' style={{ zIndex: 9999 }} />
      )}
      <TeamInitDialog open={isDialogOpen_teamInit} />
      <motion.h1 className='flex w-full items-center justify-between gap-2 py-4 text-2xl font-bold italic'>
        <div className='flex-1'>
          <ScoreBoardTeamDetail
            name={vetoState.team1}
            action={vetoState.type as BanOrPick}
            showIndicator={vetoState.team === 1}
          />
        </div>
        <p className='text-sm'>vs</p>
        <div className='flex flex-1 justify-end'>
          <ScoreBoardTeamDetail
            className='flex-row-reverse'
            name={vetoState.team2}
            action={vetoState.type as BanOrPick}
            showIndicator={vetoState.team === 2}
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
                const isBanned = vetoState.banned?.some((m) => m.name === map)
                const isSelected = vetoState.selected?.some((m) => m.name === map)
                if (isBanned || isSelected) return null

                /*
                  After the decider map animation starts, we will set the isChoosingSides state to true
                  and not render other maps which are eliminated and only render the decider map.
                */
                if (
                  deciderAnimationState === AnimationState.Started &&
                  deciderMap_forAnimationOnly?.name !== map
                )
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
                    render={({ distance }) => (
                      <AnimatingMapCardContents distance={distance} map={mapData!} />
                    )}
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
      {!!vetoState.logs.length && (
        <div className='flex flex-col gap-1 py-2'>
          <LogsDialog
            logs={vetoState.logs}
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
        <SidePickDialog
          teams={{ team1: vetoState.team1, team2: vetoState.team2 }}
          map={currentSideChoiceMap!}
        />
      )}
    </CenteredPageLayout>
  )
}
