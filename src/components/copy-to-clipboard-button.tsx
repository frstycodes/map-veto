import { AlertCircle, CheckCheckIcon, ClipboardList } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
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
    }
  }

  //IIFE
  const buttonContent = (() => {
    if (error) return <AlertCircle className='text-destructive h-5 w-5 animate-in zoom-in-50' />
    if (copied) return <CheckCheckIcon className='text-emerald-500 h-5 w-5 animate-in zoom-in-50' />
    return <ClipboardList className='h-5 w-5 animate-in zoom-in-50' />
  })()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleCopy}
          variant='outline'
          {...props}
          className={cn('h-10 rounded-lg aspect-square px-0', props.className)}
        >
          {buttonContent}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy to clipboard</TooltipContent>
    </Tooltip>
  )
}
