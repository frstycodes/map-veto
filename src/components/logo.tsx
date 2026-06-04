import { playHoverSound } from '@/assets/sfx/hover/hover'
import { Link } from '@tanstack/react-router'
import { cn } from '@/utils/tailwind-utils'
import { motion } from 'framer-motion'
import { ComponentProps } from 'react'
import { Map } from 'lucide-react'

const MotionLink = motion.create(Link)
type LogoProps = ComponentProps<typeof MotionLink>

export function Logo(props: LogoProps) {
  return (
    <MotionLink
      key='logo'
      to='/'
      layoutId='logo'
      layout='position'
      {...props}
      onMouseEnter={(e) => {
        playHoverSound(1)
        props.onMouseEnter?.(e)
      }}
      transition={{ visualDuration: 5, type: 'spring', bounce: 0.2, ...props.transition }}
      className={cn('text-3xl font-bold', props.className)}
    >
      <Map className='inline h-8 w-8' /> Map Veto
    </MotionLink>
  )
}
