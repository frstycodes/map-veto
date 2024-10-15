import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/providers/theme-provider'
import Particles from '@/components/ui/particles'

export const Route = createRootRouteWithContext()({
  component: Root
})

function Root() {
  const { computedTheme } = useTheme()
  return (
    <>
      <Particles
        color={computedTheme === 'light' ? '#000' : '#fff'}
        refresh
        quantity={300}
        staticity={10}
        size={1}
        ease={80}
        className='fixed -z-10 h-full'
      />
      <Outlet />
      <div className='fixed bottom-4 right-4'>
        <ThemeToggle />
      </div>
    </>
  )
}
