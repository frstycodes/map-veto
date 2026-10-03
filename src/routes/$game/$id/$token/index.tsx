import { createFileRoute, redirect, useLoaderData } from '@tanstack/react-router'
import { LogsDialog, TeamInitDialog } from './-components'
import { landscapeImageProps } from '@/utils/image'
import { VetoBoard } from '../../-veto/veto-board'
import { getVetoSocket } from '@/lib/veto-socket'
import { useLiveVeto } from './-use-live-veto'
import { Image } from '@/components/image'

export const Route = createFileRoute('/$game/$id/$token/')({
  loader: async ({ params }) => {
    const socket = getVetoSocket(params.id)
    const [vetoState, vetoData] = await Promise.all([
      socket.send('veto:state', undefined),
      socket.send('veto:get', { token: params.token })
    ])
    return { vetoState, vetoData }
  },
  component: VetoPage,
  onError: () => {
    throw redirect({ to: '/' })
  }
})

function VetoPage() {
  const { vetoData } = Route.useLoaderData()
  const { veto, isNamingTeams } = useLiveVeto()
  const hasActions = veto.logs.length > 1

  return (
    <div className='mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 px-4 py-6'>
      <TeamInitDialog open={isNamingTeams} />
      <VetoBoard veto={veto} />
      {hasActions && (
        <LogsDialog
          logs={veto.logs}
          game={vetoData.game}
          teams={{ team1: veto.teams[1], team2: veto.teams[2] }}
        />
      )}
      <MapArtPreload />
    </div>
  )
}

// Cards swap to landscape art mid-flight; fetching it up front keeps the swap from landing on a
// blank image. Same srcset and sizes as the board, so the browser picks the same candidate.
function MapArtPreload() {
  const { config } = useLoaderData({ from: '/$game' })
  const { vetoData } = Route.useLoaderData()

  return (
    <div hidden>
      {vetoData.maps.map((name) => (
        <Image
          key={name}
          alt=''
          {...landscapeImageProps(config.maps.find((m) => m.name === name)!)}
        />
      ))}
    </div>
  )
}
