import { MapPoolSelectionDialog } from '@/components/map-pool-selection-dialog'
import { useStartVetoMutation } from '@/hooks/mutations/use-start-mutation'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { RadioGroup, RadioItem } from '@/components/ui/custom-radio'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { BanOrderDialog } from '@/components/ban-order-dialog'
import { Route as GameRoute } from '@/routes/$game/_layout'
import customPool from '@/config/games/custom_pool.json'
import { HTMLProps, useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { PageLoader } from '@/components/page-loader'
import { Loader2, Map, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppStore } from '@/state/app-store'
import { cn } from '@/utils/tailwind-utils'
import { Logo } from '@/components/logo'
import { Svg } from '@/components/svg'
import { toast } from 'sonner'

export const Route = createFileRoute('/$game/_layout/')({
  pendingComponent: PageLoader,
  component: GamePage
})

function GamePage() {
  const { store, config } = GameRoute.useLoaderData()
  const { game } = Route.useParams()
  const navigate = Route.useNavigate()
  const router = useRouter()

  const startVetoMutation = useStartVetoMutation({
    async onSuccess(data) {
      const routeData = {
        to: '/$game/$id',
        params: { game, id: data.id },
        search: { creatorToken: data.creatorToken }
      }
      await router.preloadRoute(routeData).catch(() => {
        toast.error('Failed to prefetch route')
      })
      navigate(routeData)
    },
    onError(error) {
      toast.error(error.message)
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
          Quickly veto maps for <span className='font-bold uppercase text-primary'>{config.name}</span>
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
        <StartMapVetoButton className='float-right' loading={startVetoMutation.isPending} onClick={handleStart} />
      </div>
    </CenteredPageLayout>
  )
}

type SectionProps = HTMLProps<HTMLDivElement> & {
  title?: string
  description?: string
}
function Section({ title, description, ...props }: SectionProps) {
  return (
    <div className='w-full'>
      <div className='mb-4'>
        <h1 className='w-fit text-xl font-bold'>{title}</h1>
        <p className='text-foreground/80'>{description}</p>
      </div>
      {props.children}
    </div>
  )
}

//region Choose Map Pool
function ChooseMapPool() {
  const { store, config } = GameRoute.useLoaderData()
  const { pool } = store.useStore('pool')

  const [dialogOpen, setDialogOpen] = useState(false)

  const handlePoolChange = (poolId: string) => {
    if (poolId == 'custom') return
    store.set({ pool: config.pools[poolId] })
  }
  const pools = Object.values(config.pools)
  pools.push(customPool)
  return (
    <RadioGroup className='flex flex-wrap gap-4' value={pool.id} onValueChange={handlePoolChange}>
      {pools.map(({ id, name, icon }) => {
        return (
          <RadioItem
            key={id}
            onClick={id === 'custom' ? () => setDialogOpen(true) : undefined}
            className='z-10 grid aspect-square h-28 w-40 place-items-center gap-4 rounded-2xl text-sm font-medium backdrop-blur-sm'
            value={id}
          >
            <div className='grid place-items-center gap-3'>
              <Svg svg={icon} className='stroke-[4px]' />
              {name}
            </div>
          </RadioItem>
        )
      })}
      <MapPoolSelectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </RadioGroup>
  )
}

//region Choose Best Of
function ChooseBestOf() {
  const { config, store } = GameRoute.useLoaderData()
  const { bestOf, pool } = store.useStore('bestOf', 'pool')

  useEffect(() => {
    if (bestOf + 2 <= pool.maps.length) return
    store.set({ bestOf: config.defaultBestOf })
  }, [bestOf, pool, store, config])

  return (
    <RadioGroup
      value={bestOf.toString()}
      onValueChange={(bestOf) => store.set({ bestOf: Number(bestOf) })}
      name='best-of'
      className='flex gap-4'
    >
      {config.bestOfOptions.map((mapped_bestOf) => {
        if (mapped_bestOf + 2 > pool.maps.length) return null

        return (
          <div key={mapped_bestOf}>
            <RadioItem
              className='relative grid aspect-square h-28 place-items-center rounded-2xl p-2 backdrop-blur-sm'
              value={mapped_bestOf.toString()}
            >
              <div className='flex flex-wrap items-center justify-center gap-1.5'>
                {Array.from({ length: mapped_bestOf }, (_, i) => (
                  <Swords key={i} className='h-5 w-5' />
                ))}
              </div>
              <p className='absolute bottom-1 left-3 grid place-items-center text-sm font-semibold text-foreground'>
                {mapped_bestOf}
              </p>
            </RadioItem>
          </div>
        )
      })}
    </RadioGroup>
  )
}

//region Start Map Veto Button
type StartMapVetoProps = {
  onClick?: (e: React.MouseEvent) => void
  loading?: boolean
  className?: string
}

function StartMapVetoButton(props: StartMapVetoProps) {
  const { performanceMode } = AppStore.useStore('performanceMode')
  const Comp = performanceMode ? Button : RainbowButton
  return (
    <Comp
      onClick={props.onClick}
      className={cn(
        'gap-2 font-bold text-background',
        performanceMode && 'text-md h-11 rounded-xl bg-foreground px-8 py-2 hover:bg-foreground/80',
        props.className
      )}
    >
      {props.loading && <Loader2 className='animate-spin' />}
      {!props.loading && <Map />} Start
    </Comp>
  )
}
