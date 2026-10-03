import { createFileRoute, Link, notFound, useLoaderData } from '@tanstack/react-router'
import { MOCK_TEAMS, MockPreset, useMockVeto } from './-playground/use-mock-veto'
import { CardTransition, useCardTransitionStore } from './-veto/card-transition'
import { LogsDialog } from './$id/$token/-components/logs-dialog'
import { Button } from '@/components/ui/button'
import { RotateLeft, Undo } from 'reicon-react'
import { VetoBoard } from './-veto/veto-board'
import { cn } from '@/utils/tailwind-utils'
import { z } from 'zod'

// Dev-only bench for the veto board: a client-side mock veto plus live tuning of the card flight
export const Route = createFileRoute('/$game/playground')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  validateSearch: z.object({
    bo: z.coerce.number().catch(3),
    preset: z.enum(['alternate', 'lastPick']).catch('lastPick'),
    as: z.enum(['team', 'viewer']).catch('team')
  }),
  component: PlaygroundPage
})

function PlaygroundPage() {
  const { config } = useLoaderData({ from: '/$game' })
  const { bo, preset } = Route.useSearch()
  const bestOf = config.bestOfOptions.includes(bo) ? bo : config.defaultBestOf
  // key remounts the mock veto whenever its setup changes
  return <Playground key={`${bestOf}-${preset}`} bestOf={bestOf} preset={preset} />
}

type PlaygroundProps = { bestOf: number; preset: MockPreset }

function Playground({ bestOf, preset }: PlaygroundProps) {
  const { config } = useLoaderData({ from: '/$game' })
  const { as } = Route.useSearch()
  const { veto, canUndo, undo, reset } = useMockVeto(
    config,
    bestOf,
    preset,
    as === 'viewer' ? 'viewer' : 'both'
  )

  return (
    <div className='mx-auto flex min-h-full w-full max-w-5xl flex-col gap-8 px-4 py-6'>
      <div className='flex flex-wrap items-center gap-2 text-sm'>
        <OptionGroup
          options={config.bestOfOptions.map((n) => ({
            id: String(n),
            label: `Bo${n}`,
            search: { bo: n }
          }))}
          active={String(bestOf)}
        />
        <OptionGroup
          options={[
            { id: 'lastPick', label: 'Last pick', search: { preset: 'lastPick' as const } },
            { id: 'alternate', label: 'Alternate', search: { preset: 'alternate' as const } }
          ]}
          active={preset}
        />
        <OptionGroup
          options={[
            { id: 'team', label: 'Team', search: { as: 'team' as const } },
            { id: 'viewer', label: 'Viewer', search: { as: 'viewer' as const } }
          ]}
          active={as}
        />
        <div className='ml-auto flex gap-2'>
          <LogsDialog
            logs={veto.logs}
            game={config.slug}
            teams={{ team1: MOCK_TEAMS[1], team2: MOCK_TEAMS[2] }}
          />
          <Button variant='outline' size='sm' onClick={undo} disabled={!canUndo}>
            <Undo aria-hidden className='size-4' /> Undo
          </Button>
          <Button variant='outline' size='sm' onClick={reset} disabled={!canUndo}>
            <RotateLeft aria-hidden className='size-4' /> Reset
          </Button>
        </div>
      </div>
      <CardTransitionPanel />
      <VetoBoard veto={veto} />
    </div>
  )
}

type Option = { id: string; label: string; search: Partial<ReturnType<typeof Route.useSearch>> }

function OptionGroup({ options, active }: { options: Option[]; active: string }) {
  return (
    <div className='glass-edge relative flex rounded-xl bg-foreground/[0.04] p-0.5 backdrop-blur-sm'>
      {options.map((option) => (
        <Link
          key={option.id}
          from={Route.fullPath}
          search={(prev) => ({ ...prev, ...option.search })}
          className={cn(
            'rounded-[10px] px-3 py-1 font-medium transition-colors',
            option.id === active ? 'bg-primary text-primary-foreground' : 'hover:bg-border'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}

const TRANSITION_SLIDERS = [
  { key: 'duration', label: 'Flight', min: 0.1, max: 10, step: 0.1, unit: 's' },
  { key: 'bounce', label: 'Bounce', min: 0, max: 0.8, step: 0.05, unit: '' },
  { key: 'crossfade', label: 'Art fade', min: 0, max: 1.5, step: 0.05, unit: 's' },
  { key: 'labelMove', label: 'Dot travel', min: 0, max: 2, step: 0.05, unit: 's' },
  { key: 'labelUnwrap', label: 'Unwrap', min: 0, max: 2, step: 0.05, unit: 's' }
] satisfies {
  key: keyof CardTransition
  label: string
  min: number
  max: number
  step: number
  unit: string
}[]

// Testing aid for the pool card → slab/series card flight
function CardTransitionPanel() {
  const transition = useCardTransitionStore()

  return (
    <div className='glass-edge relative flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-foreground/[0.04] px-4 py-2.5 text-sm backdrop-blur-sm'>
      <label className='flex items-center gap-2 font-medium'>
        <input
          type='checkbox'
          checked={transition.isEnabled}
          onChange={(e) => transition.update({ isEnabled: e.target.checked })}
          className='accent-primary'
        />
        Card flight
      </label>
      {TRANSITION_SLIDERS.map(({ key, label, unit, ...range }) => (
        <label
          key={key}
          className={cn('flex items-center gap-2', !transition.isEnabled && 'opacity-40')}
        >
          <span className='text-muted-foreground'>{label}</span>
          <input
            type='range'
            {...range}
            disabled={!transition.isEnabled}
            value={transition[key]}
            onChange={(e) => transition.update({ [key]: Number(e.target.value) })}
            className='w-24 accent-primary'
          />
          <span className='w-10 tabular-nums'>
            {transition[key]}
            {unit}
          </span>
        </label>
      ))}
      <Button variant='ghost' size='sm' className='ml-auto' onClick={transition.reset}>
        Reset
      </Button>
    </div>
  )
}
