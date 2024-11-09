import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'

type VetoPollerOpts<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> & {
  queryKey?: string[]
}
type VetoPoller<T> = UseQueryResult<T>
export const useVetoPoller = <T>(id: string, clientId: string, opts?: VetoPollerOpts<T>): VetoPoller<T> =>
  useQuery({
    ...opts,
    queryKey: ['veto', id],
    queryFn: async () => {
      const res = await fetch(`/api/veto/${id}/poll?token=${clientId}`)
      const data = await res.json()
      return data as T
    },
    refetchInterval: 1, // Poll immediately after each request
    refetchOnReconnect: true
  })
