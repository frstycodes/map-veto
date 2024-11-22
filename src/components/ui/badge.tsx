import { cn } from '@/utils/tailwind-utils'
import { HTMLProps } from 'react'

type BadgeProps = HTMLProps<HTMLDivElement>
export function Badge(props: BadgeProps) {
  return <div {...props} className={cn('p-2 rounded-lg font-medium', props.className)} />
}
