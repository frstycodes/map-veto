import { CopyToClipBoardButton } from '@/routes/$game/$id/-deps/copy-to-clipboard-button'
import { ExternalLinkButton } from '@/routes/$game/$id/-deps/external-link-button'
import { useParams } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'

type UrlInputProps = {
  token: string
  label: string
}
export function UrlInput(props: UrlInputProps) {
  const { game, id } = useParams({ from: '/$game/$id' })

  const url = `${window.location.origin}/${game}/${id}/${props.token}`

  return (
    <div className='space-y-2'>
      <h1 className='text-lg font-bold'>{props.label}</h1>
      <div className='flex items-center gap-2'>
        <Input
          readOnly
          value={url}
          type='password'
          onMouseEnter={(e) => (e.currentTarget.type = 'text')}
          onMouseLeave={(e) => (e.currentTarget.type = 'password')}
        />
        <CopyToClipBoardButton textToCopy={url} />
        <ExternalLinkButton url={url} />
      </div>
    </div>
  )
}
