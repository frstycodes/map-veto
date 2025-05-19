import { ChooseBestOf, ChooseMapPool, Section, StartMapVetoButton } from './-components/sections'
import { useStartVetoMutation } from '@/hooks/mutations/use-start-mutation'
import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { BanOrderDialog } from '@/components/ban-order-dialog'
import { playErrorSound } from '@/assets/sfx/error/error'
import { PageHeader } from '@/components/page-header'
import { PageLoader } from '@/components/page-loader'
import { Logo } from '@/components/logo'
import { Info } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/$game/_layout/')({
  pendingComponent: PageLoader,
  component: GamePage
})

function GamePage() {
  const { store, config } = useLoaderData({ from: '/$game/_layout' })
  const { game } = Route.useParams()
  const navigate = Route.useNavigate()

  const startVetoMutation = useStartVetoMutation({
    async onSuccess(data) {
      const routeData = {
        to: '/$game/$id',
        params: { game, id: data.id },
        search: { creatorToken: data.creatorToken }
      }
      navigate(routeData)
    },
    onError() {
      playErrorSound()
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
          <Info className='size-4' /> Veto session will expire after 3 minutes of inactivity.
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
          <StartMapVetoButton className='ml-auto' loading={startVetoMutation.isPending} onClick={handleStart} />
        </div>
      </div>
    </CenteredPageLayout>
  )
}
