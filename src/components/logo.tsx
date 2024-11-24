import { playHoverSound } from '@/assets/sfx/hover/hover'
import { Link } from '@tanstack/react-router'
import { cn } from '@/utils/tailwind-utils'
import { motion } from 'framer-motion'
import { ComponentProps } from 'react'
import { Map } from 'lucide-react'

type LogoProps = ComponentProps<typeof motion.div>
export function Logo(props: LogoProps) {
  return (
    <Link to='/'>
      <motion.div
        layoutId='logo'
        {...props}
        onMouseEnter={(e) => {
          playHoverSound(1)
          props.onMouseEnter?.(e)
        }}
        transition={{ duration: 0.8, type: 'spring', ...props.transition }}
        className={cn('text-3xl font-bold', props.className)}
      >
        <Map className='inline h-8 w-8' /> Map Veto
      </motion.div>
    </Link>
  )
}
