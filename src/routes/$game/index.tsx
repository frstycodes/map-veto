import { ChooseBestOf, ChooseMapPool, Section, StartMapVetoButton } from './-deps/sections'
import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { BanOrderDialog } from '@/components/ban-order-dialog'
import { PageLoader } from '@/components/page-loader'
import { PageHeader } from '@/components/page-header'
import { useMutation } from '@tanstack/react-query'
import { Logo } from '@/components/logo'
import { InfoCircle } from 'reicon-react'
import { createVeto } from '@/lib/veto-socket'
import { toast } from 'sonner'

export const Route = createFileRoute('/$game/')({
  pendingComponent: PageLoader,
  component: GamePage
})

function GamePage() {
  const { store, config } = useLoaderData({ from: '/$game' })
  const { game } = Route.useParams()
  const navigate = Route.useNavigate()

  const startVetoMutation = useMutation({
    mutationFn: createVeto,
    onSuccess(data) {
      navigate({
        to: '/$game/$id',
        params: { game, id: data.id },
        search: { creatorToken: data.creatorToken }
      })
    },
    onError() {
      toast.error('Failed to start veto. Please try again later.')
    }
  })

  const handleStart = () => {
    const {
      stages,
      pool: { maps },
      bestOf: rounds
    } = store.get()

    startVetoMutation.mutate({ stages, game, maps, rounds })
  }
  return (
    <CenteredPageLayout className='space-y-8 px-8 fade-in-100'>
      <header className='space-y-3'>
        <PageHeader>
          <Logo />
        </PageHeader>
        <p>
          Quickly veto maps for
          <span className='font-bold uppercase text-primary'> {config.name}</span>
        </p>
        <p className='flex items-center gap-1 text-sm text-muted-foreground'>
          <InfoCircle className='size-4' /> Veto session will expire after 3 minutes of inactivity.
        </p>
      </header>
      <div className='space-y-8 duration-500 animate-in fade-in-0'>
        <Section title='Choose Map Pool:'>
          <ChooseMapPool />
        </Section>

        <Section title='Best of:'>
          <ChooseBestOf />
        </Section>

        <Section title='Ban Order:'>
          <BanOrderDialog />
        </Section>

        <div className='flex justify-end'>
          <StartMapVetoButton
            className='ml-auto'
            loading={startVetoMutation.isPending}
            onClick={handleStart}
          />
        </div>
      </div>
    </CenteredPageLayout>
  )
}
