import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/logo'

export const Route = createFileRoute('/$game/_layout/$id/_layout')({
  component: $idLayout
})

export function $idLayout() {
  return (
    <>
      <div className='fixed w-full container transition-all left-1/2 -translate-x-1/2'>
        <AnimatePresence initial={false}>
          <Logo animate={{ scale: 0.8 }} className='absolute top-3 left-3' />
        </AnimatePresence>
      </div>
      <Outlet />
    </>
  )
}
