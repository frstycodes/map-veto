import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { Dialog } from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateTeam } from '@/utils/mutations/veto-mutations'
import { toast } from 'sonner'

export function TeamInitDialog({ open }: { open: boolean }) {
  const [teamName, setTeamName] = useState('')
  const { id, token } = useParams({ from: '/$game/$id/$token/' })

  const updateTeamMutation = useMutation({
    mutationFn: (name: string) => updateTeam(id, token, name),
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
            updateTeamMutation.mutate(teamName.trim())
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
              className='float-right'
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
