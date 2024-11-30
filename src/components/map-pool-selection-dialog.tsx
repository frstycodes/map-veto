import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { AnimatePresence, motion, MotionValue, useSpring, useTransform } from 'framer-motion'
import { CheckboxGroup, CheckboxItem } from './ui/custom-checkbox'
import { Route as GameRoute } from '@/routes/$game/_layout'
import { MapData } from '@/config/games/game-config.types'
import customPool from '@/config/games/custom_pool.json'
import { cn } from '@/utils/tailwind-utils'
import { ComponentProps } from 'react'
import { Info } from 'lucide-react'
import { Image } from './image'

type MapPoolSelectionDialogProps = ComponentProps<typeof Dialog>

export function MapPoolSelectionDialog({ ...props }: MapPoolSelectionDialogProps) {
  const { config, store } = GameRoute.useLoaderData()
  const { pool } = store.useStore('pool')
  return (
    <Dialog
      {...props}
      onOpenChange={(open) => {
        if (!open && pool.maps.length < 3) {
          const pool = config.pools[config.defaultPool]
          store.set({ pool })
        }
        props.onOpenChange?.(open)
      }}
    >
      <DialogContent className='overflow-hidden'>
        <DialogHeader>
          <DialogTitle>Create Map Pool</DialogTitle>
          <DialogDescription>Create a custom map pool by selecting the maps you want to include.</DialogDescription>
        </DialogHeader>
        <CheckboxGroup
          value={pool.maps}
          onValueChange={(pool) =>
            store.set({
              pool: {
                ...customPool,
                maps: pool
              }
            })
          }
          className='grid select-none grid-cols-12 flex-wrap gap-2'
        >
          {config.maps.map((map) => {
            return (
              <CheckboxItem
                value={map.name}
                key={map.id}
                className='group relative col-span-6 grid aspect-square h-20 w-full place-items-center overflow-hidden rounded-xl md:col-span-6'
                render={(props) => <CheckboxCustomRender {...props} map={map} />}
              />
            )
          })}
        </CheckboxGroup>
        <DialogFooter>
          <MapsMinThresholdWarning threshold={3} show={pool.maps.length < 3} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
type MapsMinThresholdWarningProps = ComponentProps<typeof motion.div> & {
  show: boolean
  threshold: number
}
export function MapsMinThresholdWarning({ threshold = 5, show, ...props }: MapsMinThresholdWarningProps) {
  return (
    <AnimatePresence mode='popLayout' initial={false}>
      {show && (
        <motion.div
          key='min-5-warn'
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          {...props}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border-2 border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-800 dark:text-yellow-200',
            props.className
          )}
        >
          <Info /> Minimum {threshold} maps required or competitive pool will be automatically selected.
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type CheckboxCustomRenderProps = {
  distance: MotionValue<number>
  map: MapData
}
function CheckboxCustomRender({ distance, map }: CheckboxCustomRenderProps) {
  const imageOpacitySync = useTransform(distance, [0, 1], [1, 0.6])
  const imageOpacity = useSpring(imageOpacitySync, {
    mass: 0.1
  })
  const image = `/optimized/${map.images[0]}`
  return (
    <>
      <Image
        asMotion
        src={image}
        srcSet={{ 480: 480 }}
        style={{
          opacity: imageOpacity
        }}
        className='absolute -z-10 h-full w-full object-cover contrast-[1.1]'
      />
      <p className='font-bold italic text-white drop-shadow-lg'>{map.name}</p>
    </>
  )
}
