import { Moon, Sun } from 'lucide-react'

import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from '@/providers/theme-provider'
import { Button } from '@/components/ui/button'

const themeChangeMap = {
  light: 'dark',
  dark: 'system',
  system: 'light'
} as const
export function ThemeToggle() {
  const { theme, setTheme, computedTheme } = useTheme()

  const handleThemeChange = () => {
    setTheme(themeChangeMap[theme])
  }
  return (
    <Button
      layout
      variant='ghost'
      className='gap-2 rounded-lg'
      onClick={handleThemeChange}
    >
      <AnimatePresence initial={false} mode='popLayout'>
        {computedTheme == 'light' ? (
          <motion.div
            key='sun'
            initial={{ rotate: 90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: -90, scale: 0 }}
          >
            <Sun className='h-[1.2rem] w-[1.2rem]' />
          </motion.div>
        ) : (
          <motion.div
            key='moon'
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
          >
            <Moon className='h-[1.2rem] w-[1.2rem]' />
          </motion.div>
        )}
        <span className='sr-only'>Toggle theme</span>
        <motion.p key='theme-name' className='capitalize'>
          {theme}
        </motion.p>
      </AnimatePresence>
    </Button>
  )
}
