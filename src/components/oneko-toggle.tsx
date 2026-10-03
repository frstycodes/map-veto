import { AppStore } from '@/state/app-store'
import { cn } from '@/utils/tailwind-utils'
import { Button } from './ui/button'
import { Cat } from 'reicon-react'

export function OnekoToggle() {
  const { onekoEnabled: enabled } = AppStore.useStore('onekoEnabled')

  return (
    <Button
      onClick={() => AppStore.set({ onekoEnabled: !enabled })}
      variant='ghost'
      className={cn('gap-2 text-sm', enabled && 'glass-edge glass-edge-active bg-primary/20')}
    >
      <Cat className='size-4' />
      Oneko
    </Button>
  )
}
