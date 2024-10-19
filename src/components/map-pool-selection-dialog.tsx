import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import {
  AnimatePresence,
  motion,
  MotionValue,
  useSpring,
  useTransform
} from 'framer-motion'
import { CheckboxGroup, CheckboxItem } from './ui/custom-checkbox'
import { MapData } from '@root/types/shared/game-config.types'
import { Info, Settings } from 'lucide-react'
import { Route } from '@/routes/$game'
import { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type MapPoolSelectionDialogProps = ComponentProps<typeof Dialog>

const customPool = {
  id: 'custom',
  name: 'Custom',
  icon: Settings,
  maps: []
}

export function MapPoolSelectionDialog({
  ...props
}: MapPoolSelectionDialogProps) {
  const { config, store } = Route.useLoaderData()
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
          className='gap-2 flex-wrap grid grid-cols-12 select-none'
        >
          {config.maps.map((map) => {
            return (
              <CheckboxItem
                value={map.name}
                key={map.id}
                className='h-20 col-span-6 md:col-span-6 w-full relative group aspect-square grid place-items-center rounded-xl overflow-hidden'
                render={(props) => (
                  <CheckboxCustomRender {...props} map={map} />
                )}
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
export function MapsMinThresholdWarning({
  threshold = 5,
  show,
  ...props
}: MapsMinThresholdWarningProps) {
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
            'rounded-xl w-full flex items-center gap-2 border-yellow-500/20 text-yellow-800 dark:text-yellow-200 bg-yellow-500/10 text-xs border-2 px-4 py-3',
            props.className
          )}
        >
          <Info /> Minimum {threshold} maps required or competitive pool will be
          automatically selected.
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
  const image = `./maps/${map.images[0]}`
  return (
    <>
      <motion.img
        src={image}
        style={{
          opacity: imageOpacity
        }}
        className='h-full absolute contrast-[1.1] -z-10 w-full object-cover'
      />
      <p className='font-bold italic text-white drop-shadow-lg'>{map.name}</p>
    </>
  )
}
