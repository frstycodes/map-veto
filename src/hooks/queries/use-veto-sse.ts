import type { VetoStateResponse } from '@/utils/queries/veto-queries'
import { useEffect, useRef, useState } from 'react'
import { env } from '@root/env'

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
    const serverUrl = env.VITE_SERVER_URL
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
