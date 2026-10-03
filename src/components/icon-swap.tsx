import { AnimatePresence, motion } from 'framer-motion'
import { ReactNode } from 'react'

const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }

/** Cross-fades icons keyed by `swapKey` with blur + scale; popLayout keeps the outgoing icon from shifting layout */
export function IconSwap({ swapKey, children }: { swapKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode='popLayout' initial={false}>
      <motion.span
        key={swapKey}
        initial={HIDDEN}
        animate={SHOWN}
        exit={HIDDEN}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className='inline-flex'
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}
