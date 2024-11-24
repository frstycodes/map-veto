import { AlertCircle, CheckCheckIcon, ClipboardList } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { playUISound, Sound } from '@/utils/sfx'
import { ComponentProps, useState } from 'react'
import { cn } from '@/utils/tailwind-utils'
import { Button } from './ui/button'
import { toast } from 'sonner'

type CopyToClipBoardButtonProps = ComponentProps<typeof Button> & {
  textToCopy: string
}
export function CopyToClipBoardButton({ textToCopy, ...props }: CopyToClipBoardButtonProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(true)
      toast.error('Failed to copy!')
      playUISound(Sound.Error)
    }
  }

  //IIFE
  const buttonContent = (() => {
    if (error) return <AlertCircle className='h-5 w-5 text-destructive animate-in zoom-in-50' />
    if (copied) return <CheckCheckIcon className='h-5 w-5 text-emerald-500 animate-in zoom-in-50' />
    return <ClipboardList className='h-5 w-5 animate-in zoom-in-50' />
  })()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleCopy}
          variant='outline'
          {...props}
          className={cn('aspect-square h-10 rounded-lg px-0', props.className)}
        >
          {buttonContent}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy to clipboard</TooltipContent>
    </Tooltip>
  )
}
