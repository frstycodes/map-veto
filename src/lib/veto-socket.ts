import type { VetoEvents, VetoHandler } from '../../server/src/ws-router'
import type { StartVetoBody } from '../../server/src/schemas'
import { createClient } from 'socket-rpc/client'
import { env } from '@root/env'

export type VetoSocket = ReturnType<typeof createVetoSocket>

/**
 * One socket per veto, shared by route loaders and components. Sockets are
 * cached because the Durable Object is addressed by the veto id — reconnecting
 * per component would open a new session-scoped connection each time.
 */
export function getVetoSocket(id: string): VetoSocket {
  const existing = sockets.get(id)
  if (existing) return existing

  const socket = createVetoSocket(id)
  sockets.set(id, socket)
  return socket
}

export async function createVeto(body: StartVetoBody) {
  const res = await fetch(`${env.VITE_SERVER_URL}/api/veto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('Failed to start veto')
  return res.json() as Promise<{ id: string; creatorToken: string }>
}

const sockets = new Map<string, VetoSocket>()

function createVetoSocket(id: string) {
  const url = env.VITE_SERVER_URL.replace(/^http/, 'ws') + `/api/ws/${id}`
  return createClient<VetoHandler, VetoEvents>(url, { reconnect: (retries) => retries < 5 })
}
