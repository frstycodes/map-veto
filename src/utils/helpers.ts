import { env } from '@root/env'

export function api(endPoint: string, options?: RequestInit) {
  const url = env.SERVER_URL + endPoint
  return fetch(url, options)
}
