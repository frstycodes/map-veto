import { MapPoolSelectionDialog } from '@/components/map-pool-selection-dialog'
import { RadioItem, RadioGroup } from '@/components/ui/custom-radio'
import { Boxes, Map, Medal, Settings, Swords } from 'lucide-react'
import { ROUNDS_OPTIONS, VetoCfg } from '@/state/veto-cfg-store'
import { HTMLProps, useEffect, useMemo, useState } from 'react'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import mapPools from '@/config/maps/map-pools.json'
import { isSameArray } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: IndexPage
})

function IndexPage() {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center gap-8'>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, type: 'spring' }}
        className='flex flex-col items-center justify-center'
      >
        <div className='flex flex-col gap-8'>
          <div>
            <h1 className='mb-3 flex w-fit items-center gap-2 text-3xl font-extrabold'>
              <Map className='h-8 w-8' /> Map Veto
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

export enum MapPool {
  All = 'allMaps',
  Competitive = 'competitiveMaps',
  Custom = 'customMaps'
}

const MapPools = {
  [MapPool.All]: 'All Maps',
  [MapPool.Competitive]: 'Competitve Pool',
  [MapPool.Custom]: 'Custom Pool'
}

const MapPoolIcons = {
  [MapPool.All]: <Boxes />,
  [MapPool.Competitive]: <Medal />,
  [MapPool.Custom]: <Settings />
}

function ChooseMapPool() {
  const { pool } = VetoCfg.useStore('pool')
  const [dialogOpen, setDialogOpen] = useState(false)

  const poolValue = useMemo(() => {
    if (pool.length === mapPools.allMaps.length) return MapPool.All
    const isCompPool = isSameArray(pool, mapPools.competitiveMaps)
    return isCompPool ? MapPool.Competitive : MapPool.Custom
  }, [pool])

  const handlePoolChange = (value: MapPool) => {
    if (value == MapPool.Custom) return
    VetoCfg.set({
      pool: value === MapPool.All ? mapPools.allMaps : mapPools.competitiveMaps
    })
  }

  return (
    <RadioGroup
      name='map-pool'
      className='flex flex-wrap gap-4'
      value={poolValue}
      onValueChange={handlePoolChange}
    >
      {Object.entries(MapPools).map(([key, value]) => {
        return (
          <RadioItem
            key={key}
            onClick={
              key === MapPool.Custom ? () => setDialogOpen(true) : undefined
            }
            className='grid aspect-square h-28 w-40 place-items-center dark:backdrop-brightness-125 backdrop-blur-[2px] gap-4 rounded-2xl text-sm font-medium'
            value={key}
          >
            <div className='grid place-items-center gap-3'>
              {MapPoolIcons[key as MapPool]}
              {value}
            </div>
          </RadioItem>
        )
      })}
      <MapPoolSelectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </RadioGroup>
  )
}

function ChooseBestOf() {
  const { bestOf, pool } = VetoCfg.useStore('bestOf', 'pool')

  useEffect(() => {
    if (bestOf <= pool.length) return
    VetoCfg.set({
      bestOf: 1
    })
  }, [bestOf, pool])

  return (
    <RadioGroup
      value={bestOf.toString()}
      onValueChange={(bestOf) =>
        VetoCfg.set({
          bestOf: Number(bestOf) as (typeof ROUNDS_OPTIONS)[number]
        })
      }
      name='best-of'
      className='flex gap-4'
    >
      <motion.div layout className='contents'>
        <AnimatePresence mode='popLayout' initial={false}>
          {ROUNDS_OPTIONS.map((__bestOf) => {
            if (__bestOf > pool.length) return null

            return (
              <RadioItem
                key={__bestOf}
                rootProps={{
                  initial: { opacity: 0, scale: 0.7 },
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.7 }
                }}
                className='relative grid aspect-square h-28 place-items-center rounded-2xl p-2 dark:backdrop-brightness-125 backdrop-blur-[2px]'
                value={__bestOf.toString()}
              >
                <div className='flex flex-wrap items-center justify-center'>
                  {Array(__bestOf)
                    .fill(0)
                    .map((_, i) => {
                      return <Swords key={i} className='h-5 w-5' />
                    })}
                </div>
                <p className='absolute bottom-1 left-3 grid place-items-center text-sm font-semibold text-foreground'>
                  {__bestOf}
                </p>
              </RadioItem>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </RadioGroup>
  )
}

type StartMapVetoProps = {
  onClick?: (e: React.MouseEvent) => void
}

function StartMapVetoButton(props: StartMapVetoProps) {
  return (
    <RainbowButton
      onClick={props.onClick}
      className='gap-2 font-bold text-background'
    >
      <Map /> Start
    </RainbowButton>
  )
}
