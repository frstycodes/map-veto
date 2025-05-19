import { ComponentProps, useState } from 'react'
import { StageAction } from '@/types/ban-order.types'
import { Hammer, Swords } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/tailwind-utils'
import { Badge } from '@/components/ui/badge'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dialog } from '@radix-ui/react-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/utils/helpers'
import { playErrorSound } from '@/assets/sfx/error/error'
import { toast } from 'sonner'
import { Route } from '../index'

type BanOrPick = StageAction.Ban | StageAction.Pick

type ScoreBoardTeamDetailProps = ComponentProps<'p'> & {
  name: string
  action: BanOrPick
  showIndicator: boolean
}

export function ScoreBoardTeamDetail({ showIndicator, action, name, ...props }: ScoreBoardTeamDetailProps) {
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

export function VetoTurnIndicator({ vetoType, ...props }: VetoTurnIndicatorProps) {
  const ActionIcon = vetoType === StageAction.Ban ? Hammer : Swords
  const actionStyle = vetoType === StageAction.Ban ? 'text-red-500' : 'text-emerald-500'

  return (
    <motion.div layoutId='veto-indicator'>
      <ActionIcon className={cn('h-5 w-5', actionStyle, props.className)} />
    </motion.div>
  )
}

export function TeamInitDialog({ open }: { open: boolean }) {
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