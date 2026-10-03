import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { DiscordBlue } from '@/assets/svgs/discord-blue'
import { AlertCircle, Envelope, Map } from 'reicon-react'
import { Button } from './ui/button'

export function WelcomeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='ghost' className='gap-2'>
          <AlertCircle className='size-4' /> Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='font-bold'>
            <Map className='inline size-7' /> Map Veto
          </DialogTitle>
        </DialogHeader>
        <div className='text-sm text-foreground'>
          This tool is still in its early stages, so you might encounter some bugs. If you do, please report them to me
          at:
          <br />
          <div className='flex w-full items-baseline justify-center gap-2 pt-4'>
            <a href='mailto:sandeshpandeywork@gmail.com'>
              <Button variant='outline' className='h-9 gap-2'>
                <Envelope className='size-4' /> Mail
              </Button>
            </a>
            <a href='https://discordapp.com/users/454188684002983946' target='_blank'>
              <Button variant='outline' className='text-medium h-9 gap-2'>
                <DiscordBlue className='size-4' /> Discord
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
