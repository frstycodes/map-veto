import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { AnimatePresence, motion, MotionValue, useSpring, useTransform } from 'framer-motion'
import { CheckboxGroup, CheckboxItem } from '@/components/ui/custom-checkbox'
import { MapData } from '@/config/games/game-config.types'
import customPool from '@/config/games/custom_pool.json'
import { useLoaderData } from '@tanstack/react-router'
import { cn } from '@/utils/tailwind-utils'
import { landscapeImageProps } from '@/utils/image'
import { Image } from '@/components/image'
import { ComponentProps } from 'react'
import { InfoCircle } from 'reicon-react'

type MapPoolSelectionDialogProps = ComponentProps<typeof Dialog>

export function MapPoolSelectionDialog({ ...props }: MapPoolSelectionDialogProps) {
  const { config, store } = useLoaderData({ from: '/$game' })
  const { pool } = store.useStore('pool')

  const onOpenChange = (open: boolean) => {
    if (!open && pool.maps.length < 3) {
      const pool = config.pools[config.defaultPool]
      store.set({ pool })
    }
    props.onOpenChange?.(open)
  }

  return (
    <Dialog {...props} onOpenChange={onOpenChange}>
      <DialogContent className='overflow-hidden'>
        <DialogHeader>
          <DialogTitle>Create Map Pool</DialogTitle>
          <DialogDescription>
            Create a custom map pool by selecting the maps you want to include.
          </DialogDescription>
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
              <MapCheckboxItem value={map.name} key={map.name} map={map} className='col-span-6' />
            )
          })}
        </CheckboxGroup>
        <DialogFooter>
          <MapsMinThresholdWarning threshold={3} mapsCount={pool.maps.length} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
type MapsMinThresholdWarningProps = ComponentProps<typeof motion.div> & {
  threshold: number
  mapsCount: number
}
export function MapsMinThresholdWarning({
  threshold = 5,
  mapsCount,
  ...props
}: MapsMinThresholdWarningProps) {
  return (
    <AnimatePresence mode='popLayout' initial={false}>
      {mapsCount < threshold && (
        <motion.div
          key='min-5-warn'
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          {...props}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border-2 border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200',
            props.className
          )}
        >
          <InfoCircle /> Minimum {threshold} maps required or competitive pool will be automatically
          selected.
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type MapCheckboxItemProps = ComponentProps<typeof CheckboxItem> & { map: MapData }

// className lands on both the checkbox root and its card, so the skew goes through style (root only)
export function MapCheckboxItem({ map, className, ...props }: MapCheckboxItemProps) {
  return (
    <CheckboxItem
      {...props}
      style={{ transform: 'skewX(-8deg)' }}
      className={cn(
        'group relative flex h-20 w-full items-end overflow-hidden rounded-xl group-data-[state=checked]:!bg-primary/10',
        className
      )}
      render={(renderProps) => <CheckboxCustomRender {...renderProps} map={map} />}
    />
  )
}

type CheckboxCustomRenderProps = {
  distance: MotionValue<number>
  map: MapData
}
function CheckboxCustomRender({ distance, map }: CheckboxCustomRenderProps) {
  const overlayOpacitySync = useTransform(distance, [0, 1], [0.1, 0])
  const imageOpacity = useSpring(overlayOpacitySync, {
    mass: 0.1
  })
  return (
    <>
      <Image
        asMotion
        {...landscapeImageProps(map)}
        className='absolute -z-10 h-full w-full object-cover'
      />
      <motion.div
        style={{
          opacity: imageOpacity
        }}
        className='absolute inset-0 z-0 bg-background'
      />
      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent' />
      <p className='relative isolate mb-2 ml-3 py-0.5 text-sm font-bold text-white transition-[margin,padding] duration-200 ease-out [text-shadow:0_1px_2px_rgb(0_0_0/0.9)] group-data-[state=checked]:ml-2 group-data-[state=checked]:px-2 group-data-[state=checked]:text-primary-foreground group-data-[state=checked]:[text-shadow:none] motion-reduce:transition-none'>
        <span
          aria-hidden
          className='glass-edge absolute inset-0 -z-10 origin-left -translate-x-4 scale-75 bg-primary opacity-0 shadow-lift blur-sm transition-[transform,filter,opacity] duration-200 ease-out group-data-[state=checked]:translate-x-0 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100 group-data-[state=checked]:blur-0 motion-reduce:transition-none'
        />
        {map.name}
      </p>
    </>
  )
}
