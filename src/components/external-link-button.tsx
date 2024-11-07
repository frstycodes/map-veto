import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Button, buttonVariants } from './ui/button'
import { ExternalLinkIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/utils/tailwind-utils'
import { ComponentProps } from 'react'

type ExternalLinkButtonProps = ComponentProps<typeof Button> & {
  url: string
}
export function ExternalLinkButton(props: ExternalLinkButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          className={cn(buttonVariants({ variant: 'outline' }), 'px-0 aspect-square')}
          to={props.url}
          target='_blank'
        >
          <ExternalLinkIcon className='h-5 w-5' />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Open in new tab</TooltipContent>
    </Tooltip>
  )
}
