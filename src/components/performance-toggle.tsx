import { Rocket, Stars } from 'reicon-react'

import { IconSwap } from '@/components/icon-swap'
import { Button } from '@/components/ui/button'
import { AppStore } from '@/state/app-store'

export function PerformanceModeToggle() {
  const { performanceMode } = AppStore.useStore('performanceMode')

  const handleThemeChange = () => {
    AppStore.set({ performanceMode: !performanceMode })
  }
  return (
    <Button variant='ghost' className='gap-2' onClick={handleThemeChange}>
      <IconSwap swapKey={performanceMode ? 'performance' : 'quality'}>
        {performanceMode ? (
          <Rocket className='size-[1.2rem]' />
        ) : (
          <Stars className='size-[1.2rem]' />
        )}
      </IconSwap>
      <p className='capitalize'>{performanceMode ? 'performance' : 'quality'}</p>
    </Button>
  )
}
