export type Emit<Code extends string, Data, Target extends 'self' | 'all'> = {
  readonly target: Target
  readonly code: Code
  readonly data: Data
}

export type AnyEmit = Emit<string, any, 'self' | 'all'>
export type ReplyFn = <C extends string, D>(code: C, data: D) => Emit<C, D, 'self'>
export type ReplyAllFn = <C extends string, D>(code: C, data: D) => Emit<C, D, 'all'>
