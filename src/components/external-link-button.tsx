import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { playHoverSound } from '@/assets/sfx/hover/hover'
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
          className={cn(buttonVariants({ variant: 'outline' }), 'aspect-square px-0')}
          to={props.url}
          target='_blank'
          onMouseEnter={() => {
            playHoverSound(1)
          }}
        >
          <ExternalLinkIcon className='h-5 w-5' />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Open in new tab</TooltipContent>
    </Tooltip>
  )
}
