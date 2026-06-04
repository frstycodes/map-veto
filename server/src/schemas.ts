import z from 'zod/v4'

// ─── Shared sub-schemas ──────────────────────────────────────────────────────
const teamsSchema = z.union([z.literal(1), z.literal(2), z.literal(0)])

export const StageSchema = z.object({
  team: teamsSchema,
  type: z.enum(['pick', 'ban', 'decider']).nullable()
})

export const PickedMapSchema = z.object({
  name: z.string(),
  by: teamsSchema,
  attacker: z.number().optional(), // 1 | 2, set during side pick
  sidePickTurn: z.number().optional() // 1 | 2, set at pick time
})

export const BannedMapSchema = z.object({
  name: z.string(),
  by: teamsSchema
})

// ─── Log event schemas ───────────────────────────────────────────────────────

export const VetoLogSchema = z.object({
  time: z.string(),
  data: z.discriminatedUnion('event', [
    z.object({ event: z.literal('init'), maps: z.array(z.string()) }),
    z.object({
      event: z.literal('ban'),
      map: z.string(),
      by: z.union([z.literal(1), z.literal(2)])
    }),
    z.object({
      event: z.literal('pick'),
      map: z.string(),
      by: z.union([z.literal(1), z.literal(2)])
    }),
    z.object({ event: z.literal('decider'), map: z.string() }),
    z.object({
      event: z.literal('side-pick'),
      map: z.string(),
      side: z.enum(['attack', 'defend']),
      team: z.union([z.literal(1), z.literal(2)])
    })
  ])
})

// ─── Input schemas ───────────────────────────────────────────────────────────

export const StartVetoInputSchema = z.object({
  game: z.string(),
  rounds: z.number().int().min(1),
  maps: z.array(z.string()).min(1),
  stages: z.array(StageSchema).min(1)
})

export const GetVetoInputSchema = z.object({
  id: z.string(),
  token: z.string()
})

export const GetVetoStateInputSchema = z.object({
  id: z.string()
})

export const GetTokensInputSchema = z.object({
  id: z.string(),
  creatorToken: z.string()
})

export const ActionInputSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  map: z.string()
})

export const PickSideInputSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  attacker: z.boolean()
})

export const UpdateTeamInputSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string().min(3).max(50)
})

export const GetLogsInputSchema = z.object({
  id: z.string()
})

// ─── Output schemas ──────────────────────────────────────────────────────────

export const StartVetoOutputSchema = z.object({
  id: z.string(),
  creatorToken: z.string()
})

export const GetVetoOutputSchema = z.object({
  id: z.string(),
  myTeam: teamsSchema, // 0 (viewer) | 1 | 2
  team1: z.object({ name: z.string(), index: z.number() }),
  team2: z.object({ name: z.string(), index: z.number() }),
  maps: z.array(z.string()),
  rounds: z.number(),
  stages: z.array(StageSchema),
  game: z.string(),
  currentStage: z.number(),
  selected: z.array(PickedMapSchema),
  banned: z.array(BannedMapSchema)
})

export const VetoStateOutputSchema = z.object({
  team1: z.string(),
  team2: z.string(),
  selected: z.array(PickedMapSchema),
  banned: z.array(BannedMapSchema),
  currentStage: z.number(),
  phase: z.enum(['choose-maps', 'choose-sides']),
  ended: z.boolean()
})

export const GetTokensOutputSchema = z.object({
  tokens: z.object({
    team1: z.string(),
    team2: z.string(),
    viewers: z.string()
  })
})

export const GetLogsOutputSchema = z.array(VetoLogSchema)

export const EmptyOutputSchema = z.object({})

// ─── Inferred types (single source of truth for API shapes) ──────────────────

export type Stage = z.infer<typeof StageSchema>
export type PickedMap = z.infer<typeof PickedMapSchema>
export type BannedMap = z.infer<typeof BannedMapSchema>
export type VetoLog = z.infer<typeof VetoLogSchema>
export type VetoLogData = VetoLog['data']
export type VetoPollPayload = z.infer<typeof VetoStateOutputSchema>
export type VetoResponse = z.infer<typeof GetVetoOutputSchema>
export type StartVetoBody = z.infer<typeof StartVetoInputSchema>
