import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/logo'

export const Route = createFileRoute('/$game/_layout/$id/_layout')({
  component: GameIdLayout
})

function GameIdLayout() {
  return (
    <>
      <div className='container fixed left-1/2 w-full -translate-x-1/2 transition-all'>
        <AnimatePresence initial={false}>
          <Logo animate={{ scale: 0.8 }} className='absolute left-3 top-3' />
        </AnimatePresence>
      </div>
      <Outlet />
    </>
  )
}
