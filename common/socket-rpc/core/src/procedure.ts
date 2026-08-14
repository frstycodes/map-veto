import type { InferOut, StandardSchemaV1 } from './standard-schema'
import type { AnyEmit, ReplyAllFn, ReplyFn } from './emit'

// ── Context ───────────────────────────────────────────────────────────────────

export type AnyCtx = Record<string, unknown>

export type HandlerCtx<Ctx extends AnyCtx> = Ctx & {
  reply: ReplyFn
  replyAll: ReplyAllFn
}

// ── Procedure ─────────────────────────────────────────────────────────────────

export type Procedure<Ctx extends AnyCtx, Schema extends StandardSchemaV1, Y extends AnyEmit, R> = {
  _schema: Schema | null
  _handler: (
    c: HandlerCtx<Ctx> & {
      input: InferOut<Schema>
    }
  ) => Generator<Y, R, any> | AsyncGenerator<Y, R, any>
}

export type AnyProcedure = {
  _schema: StandardSchemaV1 | null
  _handler: (
    c: HandlerCtx<any> & { input: unknown }
  ) => Generator<any, any, any> | AsyncGenerator<any, any, any>
}

// ── Builder ───────────────────────────────────────────────────────────────────

class ProcedureBuilder<Ctx extends AnyCtx, Schema extends StandardSchemaV1 | null = null> {
  constructor(private _schema: Schema | null = null) {}

  input<S extends StandardSchemaV1>(schema: S): ProcedureBuilder<Ctx, S> {
    return new ProcedureBuilder<Ctx, S>(schema)
  }

  handler<Y extends AnyEmit, R>(
    fn: (
      c: HandlerCtx<Ctx> & { input: Schema extends StandardSchemaV1 ? InferOut<Schema> : unknown }
    ) => Generator<Y, R, any> | AsyncGenerator<Y, R, any>
  ): Procedure<Ctx, Schema extends StandardSchemaV1 ? Schema : StandardSchemaV1, Y, R> {
    return {
      _schema: this._schema as any,
      _handler: fn as any
    }
  }
}

export function createProcedure<Ctx extends AnyCtx>() {
  return new ProcedureBuilder<Ctx>()
}
