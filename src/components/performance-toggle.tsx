import { Rocket, Stars } from 'lucide-react'

import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AppStore } from '@/state/app-store'

export function PerformanceModeToggle() {
  const { performanceMode } = AppStore.useStore('performanceMode')

  const handleThemeChange = () => {
    AppStore.set({ performanceMode: !performanceMode })
  }
  return (
    <Button layout variant='ghost' className='gap-2 rounded-lg' onClick={handleThemeChange}>
      <AnimatePresence initial={false} mode='popLayout'>
        {performanceMode ? <PerformanceIcon /> : <QualityIcon />}
        <span className='sr-only'>Toggle theme</span>
        <p className='capitalize'>{performanceMode ? 'performance' : 'quality'}</p>
      </AnimatePresence>
    </Button>
  )
}

function QualityIcon() {
  return (
    <motion.div
      key='icon'
      initial={{ rotate: 0, scale: 0 }}
      animate={{ rotate: 0, scale: 1 }}
      exit={{ rotate: 90, scale: 0 }}
    >
      <Stars className='h-[1.2rem] w-[1.2rem]' />
    </motion.div>
  )
}

function PerformanceIcon() {
  return (
    <motion.div
      key='icon'
      initial={{ x: -50, y: 50, scale: 0 }}
      animate={{ x: 0, y: 0, scale: 1 }}
      exit={{ x: 50, y: -50, scale: 0 }}
    >
      <Rocket className='h-[1.2rem] w-[1.2rem]' />
    </motion.div>
  )
}
