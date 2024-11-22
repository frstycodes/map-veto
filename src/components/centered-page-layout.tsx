import { cn } from '@/utils/tailwind-utils'
import { ComponentProps } from 'react'

type CenteredPageLayoutProps = ComponentProps<'div'>

export function CenteredPageLayout(props: CenteredPageLayoutProps) {
  return (
    <div className='h-full grid place-items-center'>
      <div
        {...props}
        className={cn('animate-in duration-500 transition-none slide-in-from-top-12 fade-in-0', props.className)}
      />
    </div>
  )
}
