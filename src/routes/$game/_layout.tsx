import { getGameConfig, updatePrimaryColor } from '@/utils/game-config.utils'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createVetoStore } from '@/state/veto-cfg-store'
import { PageLoader } from '@/components/page-loader'

export const Route = createFileRoute('/$game/_layout')({
  loader: async ({ params }) => {
    const [err, config] = await getGameConfig(params.game)

    if (err != null) throw redirect({ to: '/$game', params: { game: 'valorant' } })

    if (config.color) updatePrimaryColor(config.color)

    const store = createVetoStore({
      pool: config.pools[config.defaultPool],
      bestOf: config.defaultBestOf
    })

    return { store, config }
  },
  onError: () => {
    throw redirect({ to: '/$game', params: { game: 'valorant' } })
  },
  component: Outlet,
  pendingComponent: PageLoader
})
