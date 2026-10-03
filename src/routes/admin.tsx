import { CheckboxCustomRender } from '@/routes/$game/-deps/map-pool-selection-dialog'
import { CheckboxGroup, CheckboxItem } from '@/components/ui/custom-checkbox'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getGameConfig } from '@/utils/game-config.utils'
import { PageLoader } from '@/components/page-loader'
import { PageHeader } from '@/components/page-header'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import type { StoredPool } from '@root/server/src/types'
import { env } from '@root/env'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin')({
  loader: async () => {
    const [err, config] = await getGameConfig('valorant')
    if (err) throw err
    return config
  },
  pendingComponent: PageLoader,
  component: AdminPage
})

function AdminPage() {
  const config = Route.useLoaderData()
  const [password, setPassword] = useState('')
  const [comp, setComp] = useState(config.pools.comp.maps)
  const { refreshMutation, saveMutation } = usePoolAdmin(password, setComp)

  return (
    <CenteredPageLayout className='flex w-[min(40rem,calc(100vw-2rem))] flex-col gap-4 py-8'>
      <PageHeader>Valorant map pool</PageHeader>
      <Input
        type='password'
        placeholder='Admin password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <CheckboxGroup
        value={comp}
        onValueChange={setComp}
        className='grid select-none grid-cols-12 gap-2'
      >
        {config.maps.map((map) => (
          <CheckboxItem
            value={map.name}
            key={map.id}
            className='group relative col-span-6 flex h-20 w-full items-end overflow-hidden rounded-xl group-data-[state=checked]:!bg-primary/10 sm:col-span-4'
            render={(props) => <CheckboxCustomRender {...props} map={map} />}
          />
        ))}
      </CheckboxGroup>
      <div className='flex flex-wrap justify-end gap-2'>
        <Button
          variant='outline'
          disabled={!password}
          loading={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        >
          Refresh maps & rotation
        </Button>
        <Button
          disabled={!password || comp.length < 3}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate(comp)}
        >
          Save comp pool ({comp.length})
        </Button>
      </div>
    </CenteredPageLayout>
  )
}

function usePoolAdmin(password: string, onRefreshed: (comp: string[]) => void) {
  const router = useRouter()
  const onError = (err: Error) => toast.error(err.message)

  const refreshMutation = useMutation({
    mutationFn: (): Promise<StoredPool> => adminFetch('/api/pool/admin/refresh', 'POST', password),
    onSuccess: async (pool) => {
      await router.invalidate()
      if (pool.comp.length) onRefreshed(pool.comp)
      toast.success('Maps and rotation refreshed')
    },
    onError
  })
  const saveMutation = useMutation({
    mutationFn: (comp: string[]) => adminFetch('/api/pool/admin/comp', 'PUT', password, { comp }),
    onSuccess: () => toast.success('Comp pool saved'),
    onError
  })

  return { refreshMutation, saveMutation }
}

async function adminFetch(path: string, method: string, password: string, body?: object) {
  const res = await fetch(`${env.VITE_SERVER_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${password}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body)
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText)
  return res.json()
}
