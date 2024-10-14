import Particles from '@/components/ui/particles'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext()({
  component: Root
})

function Root() {
  return (
    <>
      <Particles
        refresh
        quantity={300}
        staticity={10}
        ease={80}
        className='absolute -z-10 h-full'
      />
      <Outlet />
    </>
  )
}
