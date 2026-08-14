import type { AnyCtx, AnyProcedure, HandlerCtx } from './procedure'
import type { AnyEmit } from './emit'

// ROUTER
export type Router = { [x: string]: AnyProcedure }

// LIFECYCLE
export type LifecycleFn<Ctx extends AnyCtx, Y extends AnyEmit> = (args: {
  ctx: HandlerCtx<Ctx>
  error?: unknown
}) => Generator<Y, void, any> | AsyncGenerator<Y, void, any> | void | Promise<void>

export type Lifecycle<Ctx extends AnyCtx> = {
  onOpen?: LifecycleFn<Ctx, AnyEmit>
  onClose?: LifecycleFn<Ctx, AnyEmit>
  onError?: LifecycleFn<Ctx, AnyEmit>
}

// CONNECTION OPTS
export type ConnectionOpts<Ctx extends AnyCtx> = {
  ctx: Ctx
  send: (data: string) => void
  broadcast: (data: string) => void
}

// Node's Buffer is an ArrayBufferView, so this covers ws and the browser alike.
type RawMessage = string | ArrayBuffer | ArrayBufferView

// MESSAGE FORMAT
type IncomingMessage = { id: string; code: string; data?: unknown }

// HANDLER CLASS
export class WebsocketHandler<
  R extends Router,
  L extends Lifecycle<Ctx>,
  Ctx extends AnyCtx = AnyCtx
> {
  constructor(
    private router: R,
    private lifecycle: L = {} as L
  ) {}

  connection(opts: ConnectionOpts<Ctx>) {
    const ctx: HandlerCtx<Ctx> = {
      ...opts.ctx,
      reply: (c, d) => ({ target: 'self', code: c, data: d }),
      replyAll: (c, d) => ({ target: 'all', code: c, data: d })
    }

    return {
      handleOpen: () => drain(opts, this.lifecycle.onOpen?.({ ctx })),
      handleClose: () => drain(opts, this.lifecycle.onClose?.({ ctx })),
      handleError: (error: unknown) => drain(opts, this.lifecycle.onError?.({ ctx, error })),

      handleMessage: async (raw: RawMessage) => {
        const parsed = safeJsonParse<IncomingMessage>(raw)
        if (!parsed) return

        const { id, data } = parsed

        const proc = this.router[parsed.code]
        if (!proc) return

        try {
          let validated: unknown

          if (!proc._schema) {
            validated = data
          } else {
            const res = await proc._schema['~standard'].validate(data ?? {})

            if ('issues' in res && res.issues) {
              opts.send(JSON.stringify({ type: 'response', id, ok: false, error: res.issues }))
              return
            }

            validated = res.value
          }

          const result = await drain(opts, proc._handler({ input: validated as never, ...ctx }))
          opts.send(JSON.stringify({ type: 'response', id, ok: true, result }))
        } catch (err) {
          opts.send(JSON.stringify({ type: 'response', id, ok: false, error: String(err) }))
        }
      }
    }
  }
}

function safeJsonParse<T>(raw: RawMessage): T | undefined {
  const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)

  try {
    return JSON.parse(text) as T
  } catch {
    return
  }
}

function isGenerator(
  gen: unknown
): gen is Generator<unknown, unknown, unknown> | AsyncGenerator<unknown, unknown, unknown> {
  return !!(gen && typeof gen === 'object' && 'next' in gen && typeof gen.next === 'function')
}

async function drain(
  opts: ConnectionOpts<{}>,
  gen: Generator<AnyEmit, any, any> | AsyncGenerator<AnyEmit, any, any> | void | Promise<void>
): Promise<any> {
  if (!isGenerator(gen)) return

  while (true) {
    const step = await gen.next()
    // Final return
    if (step.done) return step.value

    // Emit event `yield ctx.reply()` & `yield ctx.replyAll()`
    const payload = JSON.stringify({
      type: 'event',
      code: step.value.code,
      data: step.value.data
    })

    step.value.target === 'all' ? opts.broadcast(payload) : opts.send(payload)
  }
}
