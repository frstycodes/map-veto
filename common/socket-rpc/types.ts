import { z, ZodType, ZodError } from 'zod'

export type AnyCtx = Record<string, unknown>

// What reply/replyAll return — yielded, never sent by the handler itself
export type Emit<Code extends string, Data, Target extends 'self' | 'all'> = {
  target: Target
  code: Code
  data: Data
}

type ReplyFn = <C extends string, D>(code: C, data: D) => Emit<C, D, 'self'>
type ReplyAllFn = <C extends string, D>(code: C, data: D) => Emit<C, D, 'all'>

// Injected ctx = user's base ctx + reply/replyAll
export type HandlerCtx<Ctx extends AnyCtx> = Ctx & {
  send: ReplyFn
  broadcast: ReplyAllFn
}

// RPC call shapes
