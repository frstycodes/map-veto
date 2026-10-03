import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, CheckRead, ClipboardList } from 'reicon-react'
import { playErrorSound } from '@/assets/sfx/error/error'
import { IconSwap } from '@/components/icon-swap'
import { ComponentProps, useState } from 'react'
import { Button } from '@/components/ui/button'
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
      setTimeout(() => setError(false), 2000)
      toast.error('Failed to copy!')
      playErrorSound()
    }
  }

  const state = error ? 'error' : copied ? 'copied' : 'idle'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={handleCopy} variant='outline' size='icon' {...props}>
          <IconSwap swapKey={state}>
            <CopyStateIcon state={state} />
          </IconSwap>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy to clipboard</TooltipContent>
    </Tooltip>
  )
}

function CopyStateIcon({ state }: { state: 'error' | 'copied' | 'idle' }) {
  if (state === 'error') return <AlertCircle className='size-5 text-destructive' />
  if (state === 'copied')
    return <CheckRead className='size-5 text-emerald-400' />
  return <ClipboardList className='size-5' />
}
