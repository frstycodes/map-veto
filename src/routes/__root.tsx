import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { PerformanceModeToggle } from '@/components/performance-toggle'
import { WelcomeDialog } from '@/components/welcome-dialog'
import { OnekoToggle } from '@/components/oneko-toggle'
import { SoundToggle } from '@/components/sound-toggle'
import { QueryClient } from '@tanstack/react-query'
import Particles from '@/components/ui/particles'
import { OnekoCat } from '@/components/oneko'
import { AppStore } from '@/state/app-store'
import Ripple from '@/components/ui/ripple'

type Context = {
  queryClient: QueryClient
}
export const Route = createRootRouteWithContext<Context>()({
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
        <SoundToggle />
        <PerformanceModeToggle />
      </div>
    </>
  )
}

function Background() {
  const { performanceMode } = AppStore.useStore('performanceMode')

  if (performanceMode) return <div className='fixed inset-0 -z-50 bg-bg bg-center' />

  return (
    <>
      <Particles
        color='#fff'
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
