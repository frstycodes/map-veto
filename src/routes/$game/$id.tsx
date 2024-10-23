import { CopyToClipBoardButton } from '@/components/copy-to-clipboard-button'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { ExternalLinkButton } from '@/components/external-link-button'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { PageLoader } from '@/components/page-loader'
import { AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { LinkIcon } from 'lucide-react'
import { trpcUtils } from '@/lib/trpc'

export const Route = createFileRoute('/$game/$id')({
  loader: async ({ params }) => {
    const tokens = await trpcUtils.getTokens.ensureData(params.id)
    return { tokens }
  },
  component: VetoPage,
  pendingComponent: PageLoader
})

export function VetoPage() {
  const { tokens } = Route.useLoaderData()

  return (
    <>
      <div className='fixed inset-0 container transition-all left-1/2 -translate-x-1/2'>
        <AnimatePresence initial={false}>
          <Logo animate={{ scale: 0.8 }} className='absolute top-3 left-3' />
        </AnimatePresence>
      </div>
      <CenteredPageLayout className='space-y-10 w-1/2 min-w-[300px] max-w-[500px]'>
        <PageHeader className='text-2xl'>
          <LinkIcon className='h-6 w-6' />
          Veto Links
        </PageHeader>
        <UrlInput label='Team 1' token={tokens.team1} />
        <UrlInput label='Team 2' token={tokens.team2} />
        <UrlInput label='Viewers' token={tokens.viewers} />
      </CenteredPageLayout>
    </>
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
