import { HTMLProps } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = HTMLProps<HTMLDivElement>
export function PageHeader(props: PageHeaderProps) {
  return <h1 {...props} className={cn('text-3xl font-extrabold flex items-center gap-2', props.className)} />
}
