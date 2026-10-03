import { motion, MotionValue, useMotionTemplate, useSpring, useTransform } from 'framer-motion'
import { MapData } from '@/config/games/game-config.types'
import { Image as ImageComp } from '@/components/image'
import { useLoaderData } from '@tanstack/react-router'
import { SPRING_OPTS } from '@/config/motion-config'
import { portraitImageProps } from '@/utils/image'

export function AnimatingMapCardContents({
  distance,
  map
}: {
  distance: MotionValue<number>
  map: MapData
}) {
  const fontSizeSync = useTransform(distance, [0, 1], [1, 0.8])
  const fontSize = useSpring(fontSizeSync, SPRING_OPTS)
  // Collapsed cards (far from the cursor) carry only the name, so they get the heavier scrim
  const scrimOpacitySync = useTransform(distance, [0, 1], [0.3, 0.6])
  // distance jumps when the cursor enters the row; the spring keeps the scrim from snapping
  const scrimOpacity = useSpring(scrimOpacitySync, { stiffness: 160, damping: 26 })
  const { config } = useLoaderData({ from: '/$game' })

  return (
    <div className='relative flex h-full w-full items-center justify-center bg-cover bg-center transition-all'>
      <ImageComp
        role='presentation'
        {...portraitImageProps(map, config.slug)}
        data-ripple='image'
        className='absolute z-10 h-full w-full object-cover object-center transition-all'
      />
      {config.slug === 'cs2' && (
        <div data-ripple='fill' className='absolute inset-0 z-10 bg-black/40' />
      )}
      <motion.div
        data-ripple='fill'
        style={{ opacity: scrimOpacity }}
        className='absolute inset-0 z-10 bg-black'
      />
      <div className='z-20 grid h-full w-full place-items-center'>
        <motion.h1
          data-ripple='label'
          style={{ fontSize: useMotionTemplate`${fontSize}rem` }}
          className='relative rotate-180 whitespace-nowrap font-bold tracking-wide text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9),0_0_16px_rgb(0_0_0/0.6)] [writing-mode:vertical-rl]'
        >
          {map.name}
        </motion.h1>
      </div>
    </div>
  )
}
