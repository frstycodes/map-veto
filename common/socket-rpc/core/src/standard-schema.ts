import type { StandardSchemaV1 } from '@standard-schema/spec'

export type InferIn<Schema extends StandardSchemaV1> =
  Schema extends StandardSchemaV1<infer Input, any> ? Input : never

export type InferOut<Schema extends StandardSchemaV1> =
  Schema extends StandardSchemaV1<any, infer Output> ? Output : never

export type { StandardSchemaV1 }
