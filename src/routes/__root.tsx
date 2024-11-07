import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { PerformanceModeToggle } from '@/components/performance-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/providers/theme-provider'
import Particles from '@/components/ui/particles'
import { AppStore } from '@/state/app-store'
import Ripple from '@/components/ui/ripple'

export const Route = createRootRouteWithContext()({
  component: Root
})

function Root() {
  return (
    <>
      <Background />
      <Outlet />
      <div className='fixed flex gap-2 items-center bottom-4 right-4'>
        <PerformanceModeToggle />
        <ThemeToggle />
      </div>
    </>
  )
}

function Background() {
  const { computedTheme } = useTheme()
  const { performanceMode } = AppStore.useStore('performanceMode')

  if (performanceMode) return <div className='inset-0 -z-50 fixed bg-bg bg-center' />

  return (
    <>
      <Particles
        color={computedTheme === 'light' ? '#000' : '#fff'}
        refresh
        quantity={300}
        staticity={10}
        size={1}
        ease={80}
        className='fixed inset-0 -z-50'
      />
      <Ripple className='fixed opacity-40 -z-50' />
    </>
  )
}
