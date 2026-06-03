import { useEffect, useRef, useState } from 'react'
import type { VetoStateResponse } from '@/utils/queries/veto-queries'

type UseVetoSSEOpts = {
  initialData: VetoStateResponse
  onData?: (data: VetoStateResponse) => Promise<void>
}

type UseVetoSSEResult = {
  data: VetoStateResponse
}

export function useVetoSSE(
  id: string,
  clientId: string,
  { initialData, onData }: UseVetoSSEOpts
): UseVetoSSEResult {
  const [data, setData] = useState<VetoStateResponse>(initialData)
  const onDataRef = useRef(onData)
  onDataRef.current = onData

  useEffect(() => {
    const serverUrl = (import.meta.env['VITE_SERVER_URL'] as string | undefined) ?? 'https://map-veto-server.workers.dev'
    const url = `${serverUrl}/api/veto/${id}/sse?token=${clientId}`
    const es = new EventSource(url)

    es.onmessage = async (event) => {
      const parsed = JSON.parse(event.data as string) as VetoStateResponse
      if (onDataRef.current) {
        await onDataRef.current(parsed)
      }
      setData(parsed)
    }

    es.addEventListener('close', () => {
      es.close()
    })

    return () => {
      es.close()
    }
  }, [id, clientId])

  return { data }
}
