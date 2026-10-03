import { getGameConfig, updatePrimaryColor } from '@/utils/game-config.utils'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { createVetoStore } from '@/state/veto-cfg-store'
import { PageLoader } from '@/components/page-loader'

export const Route = createFileRoute('/$game')({
  beforeLoad: ({ params }) => {
    if (params.game !== 'valorant') throw redirect({ to: '/$game', params: { game: 'valorant' } })
  },
  loader: async () => {
    const config = await getGameConfig()
    updatePrimaryColor(config.color)

    const store = createVetoStore({
      pool: config.pools[config.defaultPool],
      bestOf: config.defaultBestOf
    })

    return { store, config }
  },
  component: Outlet,
  pendingComponent: PageLoader,
  errorComponent: PoolErrorState
})

// Not a redirect: `/` forwards here, so bouncing home would loop while the worker is down
function PoolErrorState({ error }: { error: Error }) {
  return <CenteredPageLayout className='text-center'>{error.message}</CenteredPageLayout>
}
