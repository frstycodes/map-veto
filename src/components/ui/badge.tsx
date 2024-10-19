import { HTMLProps } from 'react'
import { cn } from '@/lib/utils'

type BadgeProps = HTMLProps<HTMLDivElement>
export function Badge(props: BadgeProps) {
  return (
    <div
      {...props}
      className={cn('p-2 rounded-lg font-medium', props.className)}
    />
  )
}
