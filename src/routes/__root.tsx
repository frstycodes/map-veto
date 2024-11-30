import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { PerformanceModeToggle } from '@/components/performance-toggle'
import { WelcomeDialog } from '@/components/welcome-dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { OnekoToggle } from '@/components/oneko-toggle'
import { useTheme } from '@/providers/theme-provider'
import Particles from '@/components/ui/particles'
import { OnekoCat } from '@/components/oneko'
import { AppStore } from '@/state/app-store'
import Ripple from '@/components/ui/ripple'

export const Route = createRootRouteWithContext()({
  component: Root
})

function Root() {
  return (
    <>
      <Background />
      <OnekoCat />
      <Outlet />
      <div className='fixed bottom-4 right-4 flex items-center gap-2'>
        <WelcomeDialog />
        <OnekoToggle />
        <PerformanceModeToggle />
        <ThemeToggle />
      </div>
    </>
  )
}

function Background() {
  const { computedTheme } = useTheme()
  const { performanceMode } = AppStore.useStore('performanceMode')

  if (performanceMode) return <div className='fixed inset-0 -z-50 bg-bg bg-center' />

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
      <Ripple className='fixed -z-50 opacity-40' />
    </>
  )
}
