import { motion, MotionValue, useMotionTemplate, useSpring, useTransform } from 'framer-motion'
import { MapData } from '@/config/games/game-config.types'
import { PickedMap } from '@/utils/queries/veto-queries'
import { Image as ImageComp } from '@/components/image'
import { useLoaderData } from '@tanstack/react-router'
import { SPRING_OPTS } from '@/config/motion-config'
import { getPickedByTeam } from './side-pick-dialog'
import { Shield, SwordsIcon } from 'lucide-react'
import { cn } from '@/utils/tailwind-utils'
import { ComponentProps } from 'react'

type Teams = {
  team1: string
  team2: string
}

export function AnimatingMapCardContents({
  distance,
  map
}: {
  distance: MotionValue<number>
  map: MapData
}) {
  const fontSizeSync = useTransform(distance, [0, 1], [1, 0.8])
  const fontSize = useSpring(fontSizeSync, SPRING_OPTS)
  const { vetoData } = useLoaderData({ from: '/$game/$id/$token/' })
  const imageURL = `/optimized/${map.cardImage}`

  return (
    <div className='relative flex h-full w-full items-center justify-center bg-cover bg-center transition-all'>
      <ImageComp
        role='presentation'
        src={imageURL}
        // We have screen width smaller than the image width, because its for the height
        srcSet={{ 360: 640, 480: 900 }}
        sizes='300px'
        className='absolute z-10 h-full w-full object-cover object-center transition-all'
      />
      {vetoData.game === 'cs2' && <div className='absolute inset-0 z-10 bg-black/40' />}
      <div className='z-20 grid h-full w-full place-items-center'>
        <motion.h1
          style={{ fontSize: useMotionTemplate`${fontSize}rem` }}
          className='relative -rotate-90 font-bold text-white'
        >
          <div className='absolute -z-10 h-full w-full bg-black blur-3xl' />
          {map.name}
        </motion.h1>
      </div>
    </div>
  )
}

type SelectedMapCardProps = ComponentProps<typeof motion.div> & {
  map: PickedMap
  teams: Teams
}

export function SelectedMapCard({ map, teams, ...props }: SelectedMapCardProps) {
  const { config } = useLoaderData({ from: '/$game' })
  const { vetoData } = useLoaderData({ from: '/$game/$id/$token/' })

  const mapData = config.maps.find((m) => m.name === map.name)
  const pickedByTeam = getPickedByTeam(map.by || 0, vetoData.myTeam, teams)
  const mapUrl = `/optimized/${mapData?.selectedImage}`

  return (
    <motion.div
      layoutId={map.name}
      {...props}
      initial={{ skewX: -8 }}
      animate={{ skewX: -8 }}
      className={cn(
        'relative flex h-24 min-w-24 max-w-80 flex-1 cursor-pointer items-center overflow-hidden rounded-lg bg-cover bg-center shadow-lg',
        props.className
      )}
      transition={{
        type: 'spring',
        duration: 0.5,
        ...props.transition
      }}
    >
      <ImageComp
        asMotion
        src={mapUrl}
        transition={{
          type: 'spring',
          duration: 0.5
        }}
        srcSet={{ 480: 480 }}
        className='absolute size-full object-cover object-center'
      />

      {!!map.attacker && (
        <div
          className={cn(
            'absolute top-0 flex h-10 w-full justify-between bg-gradient-to-b from-black/70 to-black/0 px-2 py-2 animate-in fade-in-0 slide-in-from-top-2',
            map.attacker === 2 && 'flex-row-reverse'
          )}
        >
          <SwordsIcon className='size-5 fill-white/40 text-white drop-shadow-md' />
          <Shield className='size-5 fill-white/40 text-white drop-shadow-md' />
        </div>
      )}

      <motion.div className='absolute bottom-0 left-0 flex h-fit items-baseline gap-2 bg-primary px-4 text-primary-foreground drop-shadow-lg'>
        <p className='text-sm font-bold'>{map.name}</p>
        {pickedByTeam && <p className='text-xs font-medium'> - {pickedByTeam}</p>}
      </motion.div>
    </motion.div>
  )
}

export function preloadMapImages(maps: MapData[]) {
  for (const map of maps) {
    const sidePickImage = new Image()
    const selectedImage = new Image()

    sidePickImage.src = `/optimized/${map.sidePickImage.slice(0, -5)}-1024w.webp`
    selectedImage.src = `/optimized/${map.sidePickImage.slice(0, -5)}-480w.webp`
  }
}
