// Only /api/* reaches this Worker (run_worker_first); everything else is served from ./dist.
export default {
  fetch: (req: Request, env: { SERVER: { fetch: typeof fetch } }) => env.SERVER.fetch(req)
}
