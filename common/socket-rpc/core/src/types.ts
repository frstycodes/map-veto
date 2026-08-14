import type { Lifecycle, Router, WebsocketHandler } from './handler'
import type { InferIn, StandardSchemaV1 } from './standard-schema'
import type { AnyCtx, Procedure } from './procedure'
import type { Emit } from './emit'

// ── Router call types (for client.send) ──────────────────────────────────────

export type InferRouterTypes<R extends Router> = {
  [K in keyof R]: R[K] extends Procedure<any, infer S, any, infer Ret>
    ? {
        input: S extends StandardSchemaV1 ? InferIn<S> : unknown
        output: Awaited<Ret>
      }
    : never
}

// ── All emitted events across the router ─────────────────────────────────────

type RouterEmits<R extends Router> = {
  [K in keyof R]: R[K] extends Procedure<any, any, infer Y, any> ? Y : never
}[keyof R]

type LifecycleEmits<L extends Lifecycle<any>> = {
  [K in keyof L]: L[K] extends (
    args: any
  ) => Generator<infer Y, any, any> | AsyncGenerator<infer Y, any, any> | void | Promise<void>
    ? Y
    : never
}[keyof L]

type AllEmits<R extends Router, L extends Lifecycle<any>> = RouterEmits<R> | LifecycleEmits<L>

// ── Event map (for client.on) ─────────────────────────────────────────────────

export type EventMap<R extends Router, L extends Lifecycle<any> = {}> = {
  [E in AllEmits<R, L> as E extends Emit<infer C, any, any> ? C : never]: E extends Emit<
    any,
    infer D,
    any
  >
    ? D
    : never
}

// ── Convenience: extract from a handler instance ─────────────────────────────

export type AnyWebsocketHandler = WebsocketHandler<Router, Lifecycle<any>, AnyCtx>

export type InferHandler<H> =
  H extends WebsocketHandler<infer R, infer L, any>
    ? { routes: InferRouterTypes<R>; events: EventMap<R, L> }
    : never
