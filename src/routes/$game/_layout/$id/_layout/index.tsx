import { CopyToClipBoardButton } from '@/components/copy-to-clipboard-button'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { ExternalLinkButton } from '@/components/external-link-button'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { PageLoader } from '@/components/page-loader'
import { LinkIcon, NotebookText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { z } from 'zod'

async function getTokens(vetoId: string, creatorToken: string) {
  const res = await fetch(`/api/veto/${vetoId}/tokens?creatorToken=${creatorToken}`)
  if (!res.ok) throw new Error('Failed to fetch tokens')
  return res.json()
}

const validateSearch = z.object({
  creatorToken: z.string().optional()
})

export const Route = createFileRoute('/$game/_layout/$id/_layout/')({
  loader: async ({ params, location }) => {
    const { creatorToken = '' } = validateSearch.parse(location.search)
    const data = await getTokens(params.id, creatorToken)
    if (!data) throw new Error('Failed to fetch tokens')
    return { tokens: data.tokens }
  },
  validateSearch,
  component: VetoPage,
  pendingComponent: PageLoader,
  onError: () => {
    throw redirect({ to: '/' })
  }
})

export function VetoPage() {
  const { tokens } = Route.useLoaderData()

  return (
    <CenteredPageLayout className='w-1/2 min-w-[300px] max-w-[500px] space-y-10'>
      <PageHeader className='text-2xl'>
        <LinkIcon className='h-6 w-6' />
        Veto Links
      </PageHeader>
      <UrlInput label='Team 1' token={tokens.team1} />
      <UrlInput label='Team 2' token={tokens.team2} />
      <UrlInput label='Viewers' token={tokens.viewers} />
      <div className='space-y-1 rounded-lg border-2 bg-background/20 px-4 py-2 text-sm text-foreground backdrop-blur-sm'>
        <h3 className='text-md flex items-center gap-1 font-bold'>
          <NotebookText className='size-4' /> Note
        </h3>
        <p>Team that starts the veto process will not get to pick side for the decider map.</p>
      </div>
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
      <div className='flex items-center gap-2'>
        <Input
          readOnly
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
