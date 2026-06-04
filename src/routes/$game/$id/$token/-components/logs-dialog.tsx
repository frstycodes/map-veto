import { DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { useLoaderData } from '@tanstack/react-router'
import { Log, Logs } from '@/utils/log-events/logs'
import { Dialog } from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { NotebookText } from 'lucide-react'

type Teams = {
  team1: string
  team2: string
}

type LogsDialogProps = {
  logs: Log[]
  teams: Teams
}

export function LogsDialog(props: LogsDialogProps) {
  const { vetoData } = useLoaderData({ from: '/$game/$id/$token/' })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' className='gap-2 rounded-lg'>
          <NotebookText className='size-5' /> Logs are available: View
        </Button>
      </DialogTrigger>
      <DialogContent className='p-0'>
        <Logs
          logs={props.logs}
          game={vetoData.game}
          teams={{ team1: props.teams.team1, team2: props.teams.team2 }}
        />
      </DialogContent>
    </Dialog>
  )
}
