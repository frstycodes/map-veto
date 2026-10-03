import { DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Log, Logs } from '@/utils/log-events/logs'
import { Dialog } from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { NoteText } from 'reicon-react'

type LogsDialogProps = {
  logs: Log[]
  game: string
  teams: { team1: string; team2: string }
}

export function LogsDialog({ logs, game, teams }: LogsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' className='gap-2'>
          <NoteText aria-hidden className='size-5' /> Veto log
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-xl gap-0 overflow-hidden p-0'>
        <DialogTitle className='sr-only'>Veto log</DialogTitle>
        <Logs logs={logs} game={game} teams={teams} />
      </DialogContent>
    </Dialog>
  )
}
