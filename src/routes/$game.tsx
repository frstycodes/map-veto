import { MapPoolSelectionDialog } from '@/components/map-pool-selection-dialog'
import { RadioGroup, RadioItem } from '@/components/ui/custom-radio'
import { GameConfig } from '@root/types/shared/game-config.types'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { BanOrderDialog } from '@/components/ban-order-dialog'
import { Loader2, Map, Settings, Swords } from 'lucide-react'
import { createVetoStore } from '@/state/veto-cfg-store'
import { createFileRoute } from '@tanstack/react-router'
import { HTMLProps, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AppStore } from '@/state/app-store'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

async function getGameConfig(game: string) {
  const config: GameConfig = await import(`@/config/${game}.ts`).then(
    (mod) => mod.config
  )
  return config
}

export const Route = createFileRoute('/$game')({
  loader: async ({ params }) => {
    const config = await getGameConfig(params.game)
    const store = createVetoStore({
      pool: config.pools[config.defaultPool],
      bestOf: config.defaultBestOf
    })
    return { store, config }
  },
  pendingComponent() {
    return (
      <div className='grid h-full w-full place-items-center text-lg'>
        <motion.div
          className='flex gap-2 font-bold'
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Loader2 className='h-7 w-7 animate-spin stroke-[3px]' />
          Loading
        </motion.div>
      </div>
    )
  },
  component: GamePage
})

function GamePage() {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center gap-8'>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, type: 'spring' }}
        className='flex flex-col items-center justify-center'
      >
        <div className='flex flex-col gap-10'>
          <div>
            <h1 className='mb-3 text-3xl flex items-center gap-2 font-extrabold'>
              <Map className='h-8 w-8 inline' /> Map Veto
            </h1>
            <p>
              Quickly veto maps for{' '}
              <span className='font-bold uppercase text-primary'>Valorant</span>
            </p>
          </div>
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
            <StartMapVetoButton />
          </div>
        </div>
      </motion.div>
    </div>
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

function ChooseMapPool() {
  const { store, config } = Route.useLoaderData()
  const { pool } = store.useStore('pool')

  const [dialogOpen, setDialogOpen] = useState(false)

  const handlePoolChange = (poolId: string) => {
    if (poolId == 'custom') return
    store.set({
      pool: config.pools[poolId]
    })
  }
  const pools = Object.values(config.pools)
  pools.push({ id: 'custom', name: 'Custom', icon: Settings, maps: [] })
  return (
    <RadioGroup
      className='flex flex-wrap gap-4'
      value={pool.id}
      onValueChange={handlePoolChange}
    >
      {pools.map(({ id, name, icon: Icon }) => {
        return (
          <RadioItem
            key={id}
            onClick={id === 'custom' ? () => setDialogOpen(true) : undefined}
            className='grid aspect-square z-10 h-28 w-40 place-items-center dark:backdrop-brightness-125 backdrop-blur-xl gap-4 rounded-2xl text-sm font-medium'
            value={id}
          >
            <div className='grid place-items-center gap-3'>
              <Icon />
              {name}
            </div>
          </RadioItem>
        )
      })}
      <MapPoolSelectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </RadioGroup>
  )
}

function ChooseBestOf() {
  const { config, store } = Route.useLoaderData()
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
      {config.bestOfOptions.map((__bestOf) => {
        if (__bestOf + 2 > pool.maps.length) return null

        return (
          <motion.div
            key={__bestOf}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
          >
            <RadioItem
              className='relative grid aspect-square h-28 place-items-center rounded-2xl p-2 dark:backdrop-brightness-125 backdrop-blur-[2px]'
              value={__bestOf.toString()}
            >
              <div className='flex flex-wrap gap-1.5 items-center justify-center'>
                {Array.from({ length: __bestOf }, (_, i) => (
                  <Swords key={i} className='h-5 w-5' />
                ))}
              </div>
              <p className='absolute bottom-1 left-3 grid place-items-center text-sm font-semibold text-foreground'>
                {__bestOf}
              </p>
            </RadioItem>
          </motion.div>
        )
      })}
    </RadioGroup>
  )
}

type StartMapVetoProps = {
  onClick?: (e: React.MouseEvent) => void
}

function StartMapVetoButton(props: StartMapVetoProps) {
  const { performanceMode } = AppStore.useStore('performanceMode')
  const Comp = performanceMode ? Button : RainbowButton
  return (
    <Comp
      onClick={props.onClick}
      className={cn(
        'gap-2 font-bold text-background',
        performanceMode &&
          'rounded-xl bg-foreground py-2 hover:bg-foreground/80 text-md h-11 px-8'
      )}
    >
      <Map /> Start
    </Comp>
  )
}
