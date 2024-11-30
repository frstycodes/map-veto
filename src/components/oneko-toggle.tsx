import { AppStore } from '@/state/app-store'
import { cn } from '@/utils/tailwind-utils'
import { Button } from './ui/button'
import { Cat } from 'lucide-react'

export function OnekoToggle() {
  const { onekoEnabled: enabled } = AppStore.useStore('onekoEnabled')

  return (
    <Button
      onClick={() => AppStore.set({ onekoEnabled: !enabled })}
      variant='ghost'
      className={cn('gap-2 rounded-lg border-2 border-transparent text-sm', enabled && 'border-primary bg-primary/20')}
    >
      <Cat className='size-4' />
      Oneko
    </Button>
  )
}
