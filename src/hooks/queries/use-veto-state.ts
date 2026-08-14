import type { VetoStateResponse } from '@/utils/queries/veto-queries'
import { getVetoSocket } from '@/lib/veto-socket'
import { useEffect, useRef, useState } from 'react'

type UseVetoStateOpts = {
  initialData: VetoStateResponse
  onData?: (data: VetoStateResponse) => Promise<void>
}

/** Live veto state, pushed by the server on every mutation. */
export function useVetoState(id: string, { initialData, onData }: UseVetoStateOpts) {
  const [data, setData] = useState(initialData)
  const onDataRef = useRef(onData)
  onDataRef.current = onData

  useEffect(() => {
    return getVetoSocket(id).on('veto:state', async (next) => {
      await onDataRef.current?.(next)
      setData(next)
    })
  }, [id])

  return { data }
}
