import { MapPoolSelectionDialog } from '@/components/map-pool-selection-dialog'
import { RadioItem, RadioGroup } from '@/components/ui/custom-radio'
import { Boxes, Map, Medal, Settings, Swords } from 'lucide-react'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { createFileRoute } from '@tanstack/react-router'
import { HTMLProps, useMemo, useState } from 'react'
import mapPools from '@/config/maps/map-pools.json'
import Ripple from '@/components/ui/ripple'
import { isSameArray } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: IndexPage
})

export enum Phase {
  NotStarted,
  ChoseRounds,
  ChoseMapPool,
  TeamLinks,
  MapSelection
}

function IndexPage() {
  const [bestOf, setBestOf] = useState(1)
  const [mapPool, setMapPool] = useState(mapPools.allMaps)
  const [mapPoolDialogOpen, setMapPoolDialogOpen] = useState(false)

  const mapPoolValue = useMemo(() => {
    if (mapPool.length === mapPools.allMaps.length) return MapPool.All
    const isCompPool = isSameArray(mapPool, mapPools.competitiveMaps)
    return isCompPool ? MapPool.Competitive : MapPool.Custom
  }, [mapPool])

  const handlePoolChange = (value: MapPool) => {
    if (value == MapPool.Custom) return

    setMapPool(
      value === MapPool.All ? mapPools.allMaps : mapPools.competitiveMaps
    )
  }

  return (
    <div className='flex h-full w-full flex-col items-center justify-center gap-8'>
      <div className='flex flex-col items-center justify-center'>
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
          <Section title='Best of:'>
            <ChooseBestOf
              value={bestOf.toString()}
              onChange={(val) => setBestOf(+val)}
            />
          </Section>
          <Section title='Choose Map Pool:'>
            <ChooseMapPool
              value={mapPoolValue}
              onChange={handlePoolChange}
              onCustomClicked={() => setMapPoolDialogOpen(true)}
            />
            <MapPoolSelectionDialog
              open={mapPoolDialogOpen}
              onOpenChange={setMapPoolDialogOpen}
              pool={mapPool}
              onPoolChange={setMapPool}
            />
          </Section>
          <div className='flex justify-end'>
            <StartMapVetoButton />
          </div>
        </div>
        <Ripple className='fixed -z-10 opacity-30' />
      </div>
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

type ChooseMapPoolProps = {
  value: MapPool
  onChange: (value: MapPool) => void
  onCustomClicked: () => void
}
function ChooseMapPool(props: ChooseMapPoolProps) {
  return (
    <RadioGroup
      name='map-pool'
      className='flex flex-wrap gap-4'
      value={props.value}
      onValueChange={props.onChange}
    >
      {Object.entries(MapPools).map(([key, value]) => {
        return (
          <RadioItem
            onClick={key === MapPool.Custom ? props.onCustomClicked : undefined}
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

const BEST_OF_OPTIONS = [1, 3, 5]
type ChooseBestOfProps = {
  value?: string
  onChange?: (newValue: string) => void
}
function ChooseBestOf(props: ChooseBestOfProps) {
  return (
    <RadioGroup
      value={props.value}
      onValueChange={props.onChange}
      name='best-of'
      className='flex gap-4'
    >
      {BEST_OF_OPTIONS.map((bestOf) => (
        <RadioItem
          className='relative grid aspect-square h-28 place-items-center rounded-2xl p-2 dark:backdrop-brightness-125 backdrop-blur-[2px]'
          key={bestOf}
          value={bestOf.toString()}
        >
          <div className='flex flex-wrap items-center justify-center'>
            {Array(bestOf)
              .fill(0)
              .map(() => {
                return <Swords className='h-5 w-5' />
              })}
          </div>
          <p className='absolute bottom-1 left-3 grid place-items-center text-sm font-semibold text-foreground'>
            {bestOf}
          </p>
        </RadioItem>
      ))}
    </RadioGroup>
  )
}
