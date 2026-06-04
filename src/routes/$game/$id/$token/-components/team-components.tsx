import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { ComponentProps, useState } from 'react'
import { Dialog } from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Hammer, Swords } from 'lucide-react'
import { cn } from '@/utils/tailwind-utils'
import { motion } from 'framer-motion'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'

type BanOrPick = 'ban' | 'pick'

type ScoreBoardTeamDetailProps = ComponentProps<'p'> & {
  name: string
  action: BanOrPick
  showIndicator: boolean
}

export function ScoreBoardTeamDetail({
  showIndicator,
  action,
  name,
  ...props
}: ScoreBoardTeamDetailProps) {
  return (
    <p {...props} className={cn('relative z-10 flex w-fit items-center gap-2', props.className)}>
      {name}
      {showIndicator && <VetoTurnIndicator vetoType={action} />}
    </p>
  )
}

type VetoTurnIndicatorProps = ComponentProps<typeof Badge> & {
  vetoType: BanOrPick
}

export function VetoTurnIndicator({ vetoType, ...props }: VetoTurnIndicatorProps) {
  const ActionIcon = vetoType === 'ban' ? Hammer : Swords
  const actionStyle = vetoType === 'ban' ? 'text-red-500' : 'text-emerald-500'

  return (
    <motion.div layoutId='veto-indicator'>
      <ActionIcon className={cn('h-5 w-5', actionStyle, props.className)} />
    </motion.div>
  )
}

export function TeamInitDialog({ open }: { open: boolean }) {
  const [teamName, setTeamName] = useState('')
  const { id, token } = useParams({ from: '/$game/$id/$token/' })

  const updateTeamMutation = useMutation(
    orpc.veto.updateTeam.mutationOptions({
      onSuccess() {
        toast.success('Successfully updated team name')
        setTeamName('')
      },
      onError() {
        toast.error('Failed to update team name')
      }
    })
  )

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
            <Input
              placeholder='My Team'
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <Button
              loading={updateTeamMutation.isPending}
              type='submit'
              className='float-right rounded-lg'
            >
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
