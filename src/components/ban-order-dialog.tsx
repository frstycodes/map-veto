import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { getAvailableBanOrderPresets, validateBanOrder } from '@/utils/ban-order'
import { BanOrderPreset, Stage } from '@/types/ban-order.types'
import { playErrorSound } from '@/assets/sfx/error/error'
import { RadioGroup, RadioItem } from './ui/custom-radio'
import { useLoaderData } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Gavel, Medal, Swords } from 'lucide-react'
import { DialogHeader } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { toast } from 'sonner'

export function BanOrderDialog() {
  const { store } = useLoaderData({ from: '/$game' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const { bestOf, pool, banOrderPreset } = store.useStore('bestOf', 'pool', 'banOrderPreset')

  const presets = useMemo(
    () => getAvailableBanOrderPresets(pool.maps.length, bestOf),
    [bestOf, pool]
  )

  // Every time the Preset changes, reset the Ban Orders
  useEffect(() => {
    const lastPreset = store.get().banOrderPreset
    const newPreset = lastPreset == 'custom' ? 'lastPick' : lastPreset

    store.set({
      banOrderPreset: newPreset,
      stages: presets[newPreset].stages ?? []
    })
  }, [presets, store])

  useEffect(() => {
    if (banOrderPreset === 'custom') return

    store.set({
      stages: presets[banOrderPreset].stages ?? []
    })
  }, [banOrderPreset, store, presets])

  const handlePresetChange = (banOrderPreset: BanOrderPreset) => {
    store.set({ banOrderPreset })
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(_open) => {
        if (_open) return setDialogOpen(true)
        const validationErr = validateBanOrder(store.get().stages, store.get().bestOf)
        if (validationErr) {
          playErrorSound()
          toast.error(`Invalid Format: Falling back to Last Pick`, {
            description: validationErr
          })

          store.set({ banOrderPreset: 'lastPick' })
        }
        setDialogOpen(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' className='w-fit gap-2 rounded-lg border-2 font-semibold'>
          <Gavel /> Customize Ban Order
        </Button>
      </DialogTrigger>
      <DialogContent className='pb-2'>
        <DialogHeader>
          <DialogTitle className='inline-flex items-center gap-2'>
            <Gavel className='h-8 w-8' /> Ban Order Settings
          </DialogTitle>
          <DialogDescription>
            Customize the order in which maps are picked for the ban rounds.
          </DialogDescription>
        </DialogHeader>
        <h1 className='text-lg font-bold'>Choose Preset</h1>
        <RadioGroup className='flex gap-4' value={banOrderPreset}>
          {Object.entries(presets).map(([key, { icons, label, description, stages }]) => {
            if (!stages) return null
            return (
              <RadioItem
                onClick={() => handlePresetChange(key as BanOrderPreset)}
                key={key}
                value={key}
                className='flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl text-sm font-medium'
              >
                <div className='flex gap-2'>{icons}</div>
                {label}
                <p className='text-xs text-foreground/50'>{description}</p>
              </RadioItem>
            )
          })}
        </RadioGroup>
        <h1 className='mt-4 text-lg font-bold'>
          {banOrderPreset === 'custom' ? 'Custom Ban Order' : 'Current Ban Order'}
        </h1>
        <ManualBanOrderSettings />
        <p className='text-center text-xs text-muted-foreground'>
          Note: Invalid ban order will be reverted to <b className='text-primary'>Last Pick</b>.
        </p>
      </DialogContent>
    </Dialog>
  )
}

const STAGE_OPTIONS: Stage[] = [
  {
    team: 1,
    type: 'ban'
  },
  {
    team: 2,
    type: 'ban'
  },
  {
    team: 1,
    type: 'pick'
  },
  {
    team: 2,
    type: 'pick'
  },
  {
    team: 0,
    type: 'decider'
  },
  {
    team: 0,
    type: null
  }
]

function ManualBanOrderSettings() {
  const { store } = useLoaderData({ from: '/$game' })
  const { stages } = store.useStore('stages')

  return (
    <ul className='grid overflow-hidden rounded-md border'>
      {stages.map((stage, idx) => (
        <StageOption key={idx} stage={stage} stageIndex={idx} />
      ))}
    </ul>
  )
}

type StageOptionProps = {
  stageIndex: number
  stage: Stage
}

function StageOption({ stageIndex, stage }: StageOptionProps) {
  const { store } = useLoaderData({ from: '/$game' })

  const handleValueChange = (value: string) => {
    const [team, type] = JSON.parse(value)

    store.set((s) => {
      const __team = Number(team) || 0
      const newStages = structuredClone(s.stages)

      newStages[stageIndex] = {
        team: __team,
        type: type
      } as Stage

      return {
        stages: newStages,
        banOrderPreset: 'custom'
      }
    })
  }

  const selectValue = JSON.stringify([stage.team, stage.type])
  return (
    <li className='flex items-center justify-between gap-2 pl-4 odd:bg-foreground/5'>
      <span className='whitespace-nowrap text-sm font-medium'>Stage {stageIndex + 1}</span>
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger className='w-fit gap-4 rounded-lg border-0 bg-transparent focus:outline-0 focus:ring-0 focus:ring-offset-0'>
          <SelectValue placeholder='Select an option' />
          <SelectContent>
            {STAGE_OPTIONS.map((stage) => {
              const value = JSON.stringify([stage.team, stage.type])
              return (
                <SelectItem key={value} value={value}>
                  <OrderRenderer stage={stage} />
                </SelectItem>
              )
            })}
          </SelectContent>
        </SelectTrigger>
      </Select>
    </li>
  )
}

const stageActionBadgeBaseStyles = 'text-xs border-2 px-2 py-1'

const STAGE_ACTION_TO_BADGE_PROPS = {
  ban: {
    children: (
      <p className='flex items-center gap-1'>
        <Gavel className='h-3.5 w-3.5' /> Ban
      </p>
    ),
    className: `border-red-500 bg-red-500/20 ${stageActionBadgeBaseStyles}`
  },
  pick: {
    children: (
      <p className='flex items-center gap-1'>
        <Swords className='h-3.5 w-3.5' /> Pick
      </p>
    ),
    className: `border-emerald-500 bg-emerald-500/20 ${stageActionBadgeBaseStyles}`
  },
  decider: {
    children: (
      <p className='flex items-center gap-1'>
        <Medal className='h-3.5 w-3.5' /> Decider
      </p>
    ),
    className: `border-yellow-500 bg-yellow-500/20 ${stageActionBadgeBaseStyles}`
  },
  noAction: {
    children: 'No Action',
    className: `text-xs ${stageActionBadgeBaseStyles}`
  }
}

const TEAM_TO_BADGE_PROPS = {
  1: {
    children: 'Team 1',
    className: `bg-blue-500/20 border-blue-500 ${stageActionBadgeBaseStyles}`
  },
  2: {
    children: 'Team 2',
    className: `bg-red-500/20 border-red-500 ${stageActionBadgeBaseStyles}`
  }
}

type OrderRendererProps = {
  stage: Stage
}

function OrderRenderer(props: OrderRendererProps) {
  const { team, type } = props.stage
  const banBadgeProps = STAGE_ACTION_TO_BADGE_PROPS[type ?? 'noAction']
  const teamBadgeProps = team ? TEAM_TO_BADGE_PROPS[team] : {}
  return (
    <div className='flex gap-2'>
      {!!team && <Badge {...teamBadgeProps} />}
      <Badge {...banBadgeProps} />
    </div>
  )
}
