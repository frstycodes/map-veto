import { CenteredPageLayout } from '@/components/centered-page-layout'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { cn, SQUIRCLE_SM } from '@/utils/tailwind-utils'
import { PageLoader } from '@/components/page-loader'
import { PageHeader } from '@/components/page-header'
import { getVetoSocket } from '@/lib/veto-socket'
import { Link, NoteText } from 'reicon-react'
import { UrlInput } from './-deps/url-input'
import { z } from 'zod'

const validateSearch = z.object({
  creatorToken: z.string().optional()
})

export const Route = createFileRoute('/$game/$id/')({
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, deps }) => {
    const { creatorToken = '' } = deps.search
    const { tokens } = await getVetoSocket(params.id).send('veto:tokens', { creatorToken })
    return { tokens }
  },
  validateSearch,
  component: VetoPage,
  pendingComponent: PageLoader,
  onError: () => {
    throw redirect({ to: '/' })
  }
})

const TOKEN_GROUPS = [
  { label: 'Team 1', key: 'team1' },
  { label: 'Team 2', key: 'team2' },
  { label: 'Viewers', key: 'viewers' }
] as const

export function VetoPage() {
  const { tokens } = Route.useLoaderData()

  return (
    <CenteredPageLayout className='w-1/2 min-w-[300px] max-w-[500px] space-y-10'>
      <PageHeader className='text-2xl'>
        <Link className='h-6 w-6' />
        Veto Links
      </PageHeader>
      {TOKEN_GROUPS.map((group) => (
        <UrlInput key={group.key} label={group.label} token={tokens[group.key]} />
      ))}
      <Note />
    </CenteredPageLayout>
  )
}

function Note() {
  return (
    <div
      className={cn(
        'glass-edge relative space-y-1 bg-foreground/[0.04] px-4 py-3 text-sm text-foreground backdrop-blur-sm',
        SQUIRCLE_SM
      )}
    >
      <h3 className='text-md flex items-center gap-1 font-bold'>
        <NoteText className='size-4' /> Note
      </h3>
      <p>Team that starts the veto process will not get to pick side for the decider map.</p>
    </div>
  )
}
