import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button, buttonVariants } from '@/components/ui/button'
import { playHoverSound } from '@/assets/sfx/hover/hover'
import { ArrowUpRight } from 'reicon-react'
import { Link } from '@tanstack/react-router'
import { cn, SQUIRCLE_CONTROL } from '@/utils/tailwind-utils'
import { ComponentProps } from 'react'

type ExternalLinkButtonProps = ComponentProps<typeof Button> & {
  url: string
}
export function ExternalLinkButton(props: ExternalLinkButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          className={cn(SQUIRCLE_CONTROL, buttonVariants({ variant: 'outline', size: 'icon' }))}
          to={props.url}
          target='_blank'
          onMouseEnter={() => {
            playHoverSound(1)
          }}
        >
          <ArrowUpRight className='h-5 w-5' />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Open in new tab</TooltipContent>
    </Tooltip>
  )
}
