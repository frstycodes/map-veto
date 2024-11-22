import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { api } from '@/utils/helpers'

type VetoPollerOpts<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> & {
  queryKey?: string[]
  afterFetchSync?: (data: T) => void
}
type VetoPoller<T> = UseQueryResult<T>
export const useVetoPoller = <T>(
  id: string,
  clientId: string,
  { afterFetchSync, ...opts }: VetoPollerOpts<T> = {}
): VetoPoller<T> =>
  useQuery({
    queryKey: ['veto', id],
    ...opts,
    queryFn: async () => {
      const res = await api(`/api/veto/${id}/poll?token=${clientId}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.message)

      if (afterFetchSync) await afterFetchSync(data)

      return data as T
    },
    refetchInterval: 1, // Poll immediately after each request
    refetchOnReconnect: true
  })
