/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { cn, SQUIRCLE_CONTROL } from '@/utils/tailwind-utils'
import { Loader } from 'reicon-react'
import { playHoverSound } from '@/assets/sfx/hover/hover'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap text-sm font-medium ring-offset-background transition-[color,background-color,transform] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'glass-edge bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'glass-edge bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'glass-edge bg-foreground/[0.04] backdrop-blur-sm hover:bg-border hover:text-accent-foreground',
        secondary: 'glass-edge bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-border hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'size-10 shrink-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

const WIDTH_SPRING = { type: 'spring', duration: 0.4, bounce: 0.15 } as const

type ButtonProps = Omit<React.ComponentProps<typeof motion.button>, 'children'> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
    children?: React.ReactNode
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, children, ...props }, ref) => {
    const disabled = loading || props.disabled
    const { contentRef, width } = useContentWidth()

    return (
      <motion.button
        className={cn(
          SQUIRCLE_CONTROL,
          buttonVariants({ variant, size, className }),
          disabled && 'cursor-not-allowed',
          loading && '!opacity-100'
        )}
        ref={ref}
        initial={false}
        animate={size === 'icon' ? undefined : { width }}
        transition={WIDTH_SPRING}
        {...props}
        onMouseEnter={(e) => {
          playHoverSound(1)
          props.onMouseEnter?.(e)
        }}
        disabled={disabled}
      >
        {/* Measured, never scaled: the button animates real width so text can't stretch */}
        <span ref={contentRef} className='inline-flex shrink-0 items-center justify-center [gap:inherit]'>
          <AnimatePresence initial={false} mode='popLayout'>
            {loading && (
              <motion.span key='loader' initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Loader className='size-4 animate-spin' />
              </motion.span>
            )}
          </AnimatePresence>
          {children}
        </span>
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

function useContentWidth() {
  const contentRef = React.useRef<HTMLSpanElement>(null)
  const [width, setWidth] = React.useState<number | 'auto'>('auto')

  React.useLayoutEffect(() => {
    const content = contentRef.current
    const button = content?.parentElement
    if (!content || !button) return

    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(button)
      const chrome = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce(
        (sum, key) => sum + parseFloat(style[key as keyof CSSStyleDeclaration] as string),
        0
      )
      setWidth(content.offsetWidth + chrome)
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return { contentRef, width }
}
