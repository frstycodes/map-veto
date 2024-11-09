import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnimatingCard, AnimatingCardContainer } from '@/components/animating-cards'
import { getInitialVetoState, getVeto } from '@/utils/queries/veto-queries'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { useVetoPoller } from '@/hooks/queries/use-veto-poller'
import { sendAction } from '@/utils/mutations/veto-mutations'
import { Route as GameRoute } from '@/routes/$game/_layout'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '@/components/page-header'
import { StageAction } from '@/types/ban-order.types'
import { useMutation } from '@tanstack/react-query'
import { ComponentProps, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@radix-ui/react-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Hammer, Swords } from 'lucide-react'
import { cn } from '@/utils/tailwind-utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/$game/_layout/$id/_layout/$token')({
  loader: async ({ params }) => {
    const statePromise = getInitialVetoState(params.id)
    const dataPromise = getVeto(params.id, params.token)
    const [vetoState, vetoData] = await Promise.all([statePromise, dataPromise])
    return { vetoState, vetoData }
  },
  component: VetoPage
})

function VetoPage() {
  const { config } = GameRoute.useLoaderData()
  const { id, token } = Route.useParams()
  const { vetoState: loader_vetoState, vetoData } = Route.useLoaderData()

  const pollQuery = useVetoPoller(id, token, {
    initialData: loader_vetoState
  })

  const currentBanOrder = vetoData.stages[pollQuery.data?.currentStage ?? 0]

  const vetoState = {
    ...pollQuery.data,
    team1: pollQuery.data?.team1 || 'Team 1',
    team2: pollQuery.data?.team2 || 'Team 2',
    type: currentBanOrder.type,
    team: currentBanOrder.team ?? 0
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
          currentMapsState.banned.push(map)
        } else {
          currentMapsState.selected.push(map)
        }
        await sendAction(id, token, map)
      } catch (error) {
        // If the action fails, revert the optimistic update
        vetoState.selected = currentMapsState.selected
        vetoState.banned = currentMapsState.banned

        toast.error('Failed to send action')
        throw error
      }
    }
  })

  const isUpdateTeamDialogOpen = !!pollQuery.data?.team1 || !!pollQuery.data?.team2

  return (
    <CenteredPageLayout className='min-w-[300px] w-[80%] max-w-[600px] space-y-8'>
      <TeamInitDialog open={isUpdateTeamDialogOpen} />
      <PageHeader className='w-full flex items-center gap-2 text-2xl justify-between italic'>
        <div className='flex-1'>
          <TeamDetail
            name={vetoState.team1}
            action={vetoState.type as StageAction.Pick | StageAction.Ban}
            showIndicator={vetoState.team == 1}
          />
        </div>
        <p className='text-sm'>vs</p>
        <div className='flex-1 flex justify-end '>
          <TeamDetail
            className='flex-row-reverse'
            name={vetoState.team2}
            action={vetoState.type as StageAction.Pick | StageAction.Ban}
            showIndicator={vetoState.team == 2}
          />
        </div>
      </PageHeader>
      <AnimatePresence mode='popLayout'>
        <AnimatingCardContainer className='h-60 !w-full' cardWidth={70} gap={4}>
          {vetoData.maps.map((map, idx) => {
            const isBanned = vetoState.banned?.includes(map)
            const isSelected = vetoState.selected?.includes(map)
            if (isBanned || isSelected) return null

            const mapData = config.maps.find((m) => m.name === map)
            const imageURL = `${window.location.origin}/maps/${mapData?.images[0]}`
            return (
              <AnimatingCard
                layout
                layoutId={map}
                onClick={() => selectMapMutation.mutate(map)}
                key={idx}
                className='overflow-hidden cursor-pointer rounded-lg'
              >
                <div
                  style={{
                    backgroundImage: `url(${imageURL})`
                  }}
                  className='bg-center bg-cover flex justify-center items-center transition-all h-full w-full'
                >
                  <div className='h-full w-full grid place-items-center'>
                    <h1 className='relative text-white font-bold -rotate-90'>
                      <div className='h-full -z-10 w-full bg-black absolute blur-3xl' />
                      {map}
                    </h1>
                  </div>
                </div>
              </AnimatingCard>
            )
          })}
        </AnimatingCardContainer>
      </AnimatePresence>
      <motion.div className='space-y-4'>
        <h1 className='font-bold text-lg italic z-20'>Selected Maps:</h1>
        <motion.div layout className='flex gap-1 -z-10'>
          {!vetoState.selected?.length && (
            <motion.div
              className='text-medium text-muted-foreground italic w-full'
              exit={{
                zoom: 0
              }}
            >
              No Maps selected
            </motion.div>
          )}
          <AnimatePresence mode='popLayout'>
            <motion.div layout className='flex gap-1 w-full'>
              {vetoState.selected?.map((map) => {
                const mapData = config.maps.find((m) => m.name === map)
                const mapUrl = `/maps/${mapData?.images[3]}`
                return (
                  <motion.div
                    layoutId={map}
                    key={map}
                    className='h-24 max-w-80 flex items-center min-w-24 bg-center bg-cover flex-1 overflow-hidden cursor-pointer border-[2px] border-primary rounded-lg'
                    initial={{ skewX: -8 }}
                    animate={{ skewX: -8 }}
                    transition={{
                      type: 'spring',
                      duration: 0.5
                    }}
                  >
                    <motion.img
                      layout
                      transition={{
                        type: 'spring',
                        duration: 0.5
                      }}
                      src={mapUrl}
                      className='w-full absolute'
                    />
                    <motion.h1
                      layout
                      className='absolute bottom-0 left-0 h-fit bg-primary text-sm px-4 font-bold text-primary-foreground drop-shadow-lg'
                    >
                      {map}
                    </motion.h1>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </CenteredPageLayout>
  )
}

type TeamDetailProps = ComponentProps<'p'> & {
  name: string
  action: StageAction.Pick | StageAction.Ban
  showIndicator: boolean
}

function TeamDetail({ name, showIndicator, action, ...props }: TeamDetailProps) {
  return (
    <p {...props} className={cn('z-10 w-fit flex gap-2 items-center relative', props.className)}>
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
      const res = await fetch(`http://localhost:8000/api/veto/${id}/team/${teamId}`, {
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
          className='space-y-4 w-full '
          onSubmit={(e) => {
            e.preventDefault()
            updateTeamMutation.mutate({
              id,
              teamId: token,
              name: teamName.trim()
            })
          }}
        >
          <div className='flex gap-2 items-center'>
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
