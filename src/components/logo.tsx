import { motion } from 'framer-motion'
import { ComponentProps } from 'react'
import { Map } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoProps = ComponentProps<typeof motion.div>
export function Logo(props: LogoProps) {
  return (
    <motion.div
      layoutId='logo'
      {...props}
      transition={{ duration: 0.8, type: 'spring', ...props.transition }}
      className={cn('text-3xl font-bold', props.className)}
    >
      <Map className='h-8 w-8 inline' /> Map Veto
    </motion.div>
  )
}
