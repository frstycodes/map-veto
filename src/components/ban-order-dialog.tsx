import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { BanAction, BanOrder, BanOrderPreset } from '@/types/ban-order.types'
import { getAvailableBanOrderPresets } from '@/utils/ban-order'
import { Route as GameRoute } from '@/routes/$game/_layout'
import { RadioGroup, RadioItem } from './ui/custom-radio'
import { validateBanOrder } from '@/utils/ban-order'
import { useEffect, useMemo, useState } from 'react'
import { Gavel, Medal, Swords } from 'lucide-react'
import { DialogHeader } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { toast } from 'sonner'

export function BanOrderDialog() {
  const { store } = GameRoute.useLoaderData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const { bestOf, pool, banOrderPreset } = store.useStore('bestOf', 'pool', 'banOrderPreset')

  const presets = useMemo(() => getAvailableBanOrderPresets(pool.maps.length, bestOf), [bestOf, pool])

  // Every time the Preset changes, reset the Ban Orders
  useEffect(() => {
    const lastPreset = store.get().banOrderPreset
    const newPreset = lastPreset == BanOrderPreset.Custom ? BanOrderPreset.LastPick : lastPreset

    store.set({
      banOrderPreset: newPreset,
      banOrders: presets[newPreset].banOrders ?? []
    })
  }, [presets, store])

  useEffect(() => {
    if (banOrderPreset === BanOrderPreset.Custom) return
    store.set({
      banOrders: presets[banOrderPreset].banOrders ?? []
    })
    /**
     *  Didn't include Presets in deps because it's used in the
     *  effect above to reset the Ban Orders anyways
     */
  }, [banOrderPreset, store])

  const handlePresetChange = (banOrderPreset: BanOrderPreset) => {
    store.set({ banOrderPreset })
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(_open) => {
        if (_open) return setDialogOpen(true)
        const validationErr = validateBanOrder(store.get().banOrders, store.get().bestOf)
        if (validationErr) {
          toast.error(`Invalid Format: Falling back to Last Pick`, {
            description: validationErr
          })

          store.set({ banOrderPreset: BanOrderPreset.LastPick })
        }
        setDialogOpen(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' className='w-fit rounded-lg border-2 gap-2 font-semibold'>
          <Gavel /> Customize Ban Order
        </Button>
      </DialogTrigger>
      <DialogContent className='pb-2'>
        <DialogHeader>
          <DialogTitle className='inline-flex items-center gap-2'>
            <Gavel className='h-8 w-8' /> Ban Order Settings
          </DialogTitle>
          <DialogDescription>Customize the order in which maps are picked for the ban rounds.</DialogDescription>
        </DialogHeader>
        <h1 className='text-lg font-bold'>Choose Preset</h1>
        <RadioGroup className='flex gap-4' value={banOrderPreset}>
          {Object.entries(presets).map(([key, { icons, label, description, banOrders }]) => {
            if (!banOrders) return null
            return (
              <RadioItem
                onClick={() => handlePresetChange(key as BanOrderPreset)}
                key={key}
                value={key}
                className='h-32 flex w-full justify-center gap-2 flex-col items-center text-sm font-medium rounded-xl'
              >
                <div className='flex gap-2'>{icons}</div>
                {label}
                <p className='text-xs text-foreground/50'>{description}</p>
              </RadioItem>
            )
          })}
        </RadioGroup>
        <h1 className='text-lg font-bold mt-4'>
          {banOrderPreset === BanOrderPreset.Custom ? 'Custom Ban Order' : 'Current Ban Order'}
        </h1>
        <ManualBanOrderSettings />
        <p className='text-xs text-muted-foreground text-center'>
          Note: Invalid ban order will be reverted to <b className='text-primary'>Last Pick</b>.
        </p>
      </DialogContent>
    </Dialog>
  )
}

const BAN_ORDER_OPTIONS: BanOrder[] = [
  {
    team: 1,
    type: BanAction.Ban
  },
  {
    team: 2,
    type: BanAction.Ban
  },
  {
    team: 1,
    type: BanAction.Pick
  },
  {
    team: 2,
    type: BanAction.Pick
  },
  {
    team: null,
    type: BanAction.Decider
  },
  {
    team: null,
    type: null
  }
]

function ManualBanOrderSettings() {
  const { store } = GameRoute.useLoaderData()
  const { banOrders } = store.useStore('banOrders')

  return (
    <ul className='grid rounded-md border overflow-hidden'>
      {banOrders.map((banOrder, idx) => (
        <StageOption key={idx} banOrder={banOrder} stage={idx} />
      ))}
    </ul>
  )
}
type StageOptionProps = {
  stage: number
  banOrder: BanOrder
}

function StageOption({ stage, banOrder }: StageOptionProps) {
  const { store } = GameRoute.useLoaderData()
  const handleValueChange = (value: string) => {
    const [team, type] = JSON.parse(value)

    store.set((s) => {
      const __team = Number(team) || null
      const newBanOrders = structuredClone(s.banOrders)

      newBanOrders[stage] = {
        team: __team,
        type: type
      } as BanOrder

      return {
        banOrders: newBanOrders,
        banOrderPreset: BanOrderPreset.Custom
      }
    })
  }

  const selectValue = JSON.stringify([banOrder.team, banOrder.type])
  return (
    <li className='flex gap-2 justify-between items-center odd:bg-foreground/5 pl-4'>
      <span className='text-sm font-medium whitespace-nowrap'>Stage {stage + 1}</span>
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger className='rounded-lg border-0 bg-transparent focus:outline-0 w-fit gap-4 focus:ring-0 focus:ring-offset-0'>
          <SelectValue placeholder='Select an option' />
          <SelectContent>
            {BAN_ORDER_OPTIONS.map((order) => {
              const value = JSON.stringify([order.team, order.type])
              return (
                <SelectItem key={value} value={value}>
                  <OrderRenderer banOrder={order} />
                </SelectItem>
              )
            })}
          </SelectContent>
        </SelectTrigger>
      </Select>
    </li>
  )
}

const banActionBageBaseStyles = 'text-xs border-2 px-2 py-1'

const BAN_ACTION_TO_BADGE = {
  [BanAction.Ban]: {
    children: (
      <p className='flex gap-1 items-center'>
        <Gavel className='h-3.5 w-3.5' /> Ban
      </p>
    ),
    className: `border-red-500 bg-red-500/20 ${banActionBageBaseStyles}`
  },
  [BanAction.Pick]: {
    children: (
      <p className='flex gap-1 items-center'>
        <Swords className='h-3.5 w-3.5' /> Pick
      </p>
    ),
    className: `border-emerald-500 bg-emerald-500/20 ${banActionBageBaseStyles}`
  },
  [BanAction.Decider]: {
    children: (
      <p className='flex gap-1 items-center'>
        <Medal className='h-3.5 w-3.5' /> Decider
      </p>
    ),
    className: `border-yellow-500 bg-yellow-500/20 ${banActionBageBaseStyles}`
  },
  noAction: {
    children: 'No Action',
    className: `text-xs ${banActionBageBaseStyles}`
  }
}
const TEAM_TO_BADGE = {
  1: {
    children: 'Team 1',
    className: `bg-blue-500/20 border-blue-500 ${banActionBageBaseStyles}`
  },
  2: {
    children: 'Team 2',
    className: `bg-red-500/20 border-red-500 ${banActionBageBaseStyles}`
  }
}

type OrderRendererProps = {
  banOrder: BanOrder
}

function OrderRenderer(props: OrderRendererProps) {
  const { team, type } = props.banOrder
  const banBadge = BAN_ACTION_TO_BADGE[type ?? 'noAction']

  return (
    <div className='flex gap-2'>
      {team && <Badge {...TEAM_TO_BADGE[team]} />}
      <Badge {...banBadge} />
    </div>
  )
}
