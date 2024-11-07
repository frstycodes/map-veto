import { CopyToClipBoardButton } from '@/components/copy-to-clipboard-button'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { ExternalLinkButton } from '@/components/external-link-button'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { PageLoader } from '@/components/page-loader'
import { Input } from '@/components/ui/input'
import { LinkIcon } from 'lucide-react'

async function getTokens(vetoID: string) {
  const res = await fetch(`/api/veto/tokens/${vetoID}`)
  if (!res.ok) throw new Error('Failed to fetch tokens')
  return res.json()
}

export const Route = createFileRoute('/$game/_layout/$id/_layout/')({
  loader: async ({ params }) => {
    const data = await getTokens(params.id)
    if (!data) throw new Error('Failed to fetch tokens')
    return { tokens: data.tokens }
  },
  component: VetoPage,
  pendingComponent: PageLoader,
  onError: () => {
    throw redirect({ to: '/' })
  }
})

export function VetoPage() {
  const { tokens } = Route.useLoaderData()

  console.log({ tokens })

  return (
    <CenteredPageLayout className='space-y-10 w-1/2 min-w-[300px] max-w-[500px]'>
      <PageHeader className='text-2xl'>
        <LinkIcon className='h-6 w-6' />
        Veto Links
      </PageHeader>
      <UrlInput label='Team 1' token={tokens.team1} />
      <UrlInput label='Team 2' token={tokens.team2} />
      <UrlInput label='Viewers' token={tokens.viewers} />
    </CenteredPageLayout>
  )
}

type UrlInputProps = {
  token: string
  label: string
}
function UrlInput(props: UrlInputProps) {
  const { game, id } = Route.useParams()
  const url = `${window.location.origin}/${game}/${id}/${props.token}`
  return (
    <div className='space-y-2'>
      <h1 className='text-lg font-bold'>{props.label}</h1>
      <div className='flex gap-2 items-center'>
        <Input
          className='rounded-lg'
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
