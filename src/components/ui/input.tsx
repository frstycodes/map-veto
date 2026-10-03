import * as React from 'react'

import { cn, SQUIRCLE_CONTROL } from '@/utils/tailwind-utils'
import { motion } from 'framer-motion'

export type InputProps = React.ComponentProps<typeof motion.input>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <motion.input
      layout
      type={type}
      className={cn(
        'flex h-10 w-full border border-[hsl(var(--edge-mid))] border-t-[hsl(var(--edge-top))] bg-foreground/[0.04] backdrop-blur-sm px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        SQUIRCLE_CONTROL,
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
