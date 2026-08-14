import { AnyWebsocketHandler } from './core/src/types'
import type { InferHandler } from './core/src'

// Options
export type ClientOptions = {
  /** Called when the connection is established */
  onOpen?: () => void
  /** Called when the connection closes */
  onClose?: (event: CloseEvent) => void
  /** Called on connection errors */
  onError?: (event: Event) => void
  /** Reconnect on close. Default: false */
  reconnect?: boolean | ((retries: number) => boolean)
  /** Base delay in ms between reconnect attempts. Default: 1000 */
  reconnectDelay?: number
}

// Client
/**
 * @typeParam E - Extra server pushes that don't originate from a handler
 *                `yield`, so they can't be inferred from the router.
 */
export function createClient<H extends AnyWebsocketHandler, E = {}>(
  url: string,
  options: ClientOptions = {}
) {
  type App = InferHandler<H>
  type Routes = App['routes']
  type Events = App['events'] & E

  const pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>()
  const listeners = new Map<string, Set<(d: any) => void>>()
  const outbox: string[] = []

  let ws: WebSocket
  let reconnectAttempts = 0

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempts = 0
      outbox.splice(0).forEach((frame) => ws.send(frame))
      options.onOpen?.()
    }

    ws.onclose = (event) => {
      // Their connection is gone; without this they hang until the tab closes.
      pending.forEach(({ reject }) => reject(new Error('socket closed')))
      pending.clear()
      options.onClose?.(event)
      if (options.reconnect) {
        const shouldReconnect =
          typeof options.reconnect === 'function'
            ? options.reconnect(reconnectAttempts)
            : options.reconnect

        if (!shouldReconnect) return
        const delay = (options.reconnectDelay ?? 1000) * Math.pow(2, reconnectAttempts)
        reconnectAttempts++
        setTimeout(connect, Math.min(delay, 30_000))
      }
    }

    ws.onerror = (event) => options.onError?.(event)

    ws.onmessage = (e) => {
      let msg: {
        type: string
        id?: string
        ok?: boolean
        result?: unknown
        error?: unknown
        code?: string
        data?: unknown
      }
      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }

      if (msg.type === 'response' && msg.id) {
        const p = pending.get(msg.id)
        if (!p) return
        pending.delete(msg.id)
        msg.ok ? p.resolve(msg.result) : p.reject(msg.error)
        return
      }

      if (msg.type === 'event' && msg.code) {
        listeners.get(msg.code)?.forEach((fn) => fn(msg.data))
      }
    }
  }

  connect()

  return {
    /** RPC-style — send and await a response */
    send<K extends keyof Routes>(code: K, data: Routes[K]['input']): Promise<Routes[K]['output']> {
      const id = crypto.randomUUID()
      const frame = JSON.stringify({ id, code, data })
      const promise = new Promise<Routes[K]['output']>((resolve, reject) =>
        pending.set(id, { resolve, reject })
      )

      // Calls made before the socket opens (route loaders, first render) queue
      // instead of throwing InvalidStateError.
      if (ws.readyState === WebSocket.OPEN) ws.send(frame)
      else outbox.push(frame)

      return promise
    },

    /** Event listener — fired by server pushes from reply/replyAll */
    on<K extends keyof Events>(code: K, fn: (data: Events[K]) => void): () => void {
      if (!listeners.has(code as string)) listeners.set(code as string, new Set())
      listeners.get(code as string)!.add(fn as any)
      return () => listeners.get(code as string)?.delete(fn as any)
    },

    /** Close the connection (disables reconnect) */
    close() {
      options.reconnect = false
      ws.close()
    },

    get readyState() {
      return ws.readyState
    }
  }
}
