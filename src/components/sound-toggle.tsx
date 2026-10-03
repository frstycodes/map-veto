import { VolumeCross, VolumeHigh } from 'reicon-react'
import { IconSwap } from '@/components/icon-swap'
import { AppStore } from '@/state/app-store'
import { cn } from '@/utils/tailwind-utils'
import { Button } from './ui/button'
import '@/lib/sfx'

export function SoundToggle() {
  const { soundEnabled: enabled } = AppStore.useStore('soundEnabled')

  return (
    <Button
      onClick={() => {
        AppStore.set({ soundEnabled: !enabled })
      }}
      variant='ghost'
      className={cn('gap-2 text-sm', enabled && 'glass-edge glass-edge-active bg-primary/20')}
    >
      <IconSwap swapKey={enabled ? 'on' : 'off'}>
        {enabled ? (
          <VolumeHigh aria-hidden className='size-4' />
        ) : (
          <VolumeCross aria-hidden className='size-4' />
        )}
      </IconSwap>
      Sound
    </Button>
  )
}
