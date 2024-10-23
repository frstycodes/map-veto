import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function PageLoader() {
  return (
    <div className='grid h-full w-full place-items-center text-lg'>
      <motion.div className='flex gap-2 font-bold' initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <Loader2 className='h-7 w-7 animate-spin stroke-[3px]' />
        Loading
      </motion.div>
    </div>
  )
}
