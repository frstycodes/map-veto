// Drives a whole veto against a running `wrangler dev`. Start it first, then: bun e2e.ts
const BASE = 'http://localhost:8787'
const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`  ok — ${msg}`)
}

// 1. create
const created = await (
  await fetch(`${BASE}/api/veto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game: 'valorant',
      rounds: 1,
      maps: ['Ascent', 'Summit', 'Haven'],
      stages: [
        { team: 1, type: 'ban' },
        { team: 2, type: 'ban' },
        { team: 0, type: 'decider' }
      ]
    })
  })
).json()
assert(created.id && created.creatorToken, `created veto ${created.id}`)

// bad body is rejected
const bad = await fetch(`${BASE}/api/veto`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ game: 'valorant' })
})
assert(bad.status === 400, 'invalid create body → 400')

// socket helper
function open(id: string) {
  const ws = new WebSocket(`ws://localhost:8787/api/ws/${id}`)
  const pending = new Map<string, (r: any) => void>()
  const events: any[] = []
  const ready = new Promise((res) => (ws.onopen = () => res(null)))

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data as string)
    if (msg.type === 'response') pending.get(msg.id)?.(msg)
    if (msg.type === 'event') events.push(msg)
  }

  return {
    events,
    ready,
    close: () => ws.close(),
    call(code: string, data?: unknown) {
      const rid = crypto.randomUUID()
      ws.send(JSON.stringify({ id: rid, code, data }))
      return new Promise<any>((res) => pending.set(rid, res))
    }
  }
}

const creator = open(created.id)
await creator.ready

const tokensRes = await creator.call('veto:tokens', { creatorToken: created.creatorToken })
assert(tokensRes.ok, 'veto:tokens with the creator token')
const { team1, team2, viewers } = tokensRes.result.tokens

const badTokens = await creator.call('veto:tokens', { creatorToken: 'nope' })
assert(!badTokens.ok, 'veto:tokens rejects a wrong creator token')

// 2. two players + a viewer
const p1 = open(created.id)
const p2 = open(created.id)
const spectator = open(created.id)
await Promise.all([p1.ready, p2.ready, spectator.ready])

const me1 = await p1.call('veto:get', { token: team1 })
const me2 = await p2.call('veto:get', { token: team2 })
const meV = await spectator.call('veto:get', { token: viewers })
assert(me1.result.myTeam === 1 && me2.result.myTeam === 2, 'tokens resolve to their own team')
assert(meV.result.myTeam === 0, 'viewer token resolves to team 0')
assert(!(await p1.call('veto:get', { token: 'bogus' })).ok, 'unknown token is rejected')

// 3. turn order is enforced
assert(
  !(await p2.call('veto:action', { teamId: team2, map: 'Ascent' })).ok,
  'team 2 cannot act on team 1s turn'
)
assert(
  !(await p1.call('veto:action', { teamId: team1, map: 'Nonexistent' })).ok,
  'a map outside the pool is rejected'
)

// 4. play it out
assert((await p1.call('veto:action', { teamId: team1, map: 'Ascent' })).ok, 'team 1 bans Ascent')
assert((await p2.call('veto:action', { teamId: team2, map: 'Summit' })).ok, 'team 2 bans Summit')

await new Promise((r) => setTimeout(r, 1200)) // decider is revealed on a timer

const state = (await p1.call('veto:state')).result
assert(state.phase === 'choose-sides', 'phase advanced to choose-sides')
assert(state.selected[0].name === 'Haven', 'the last remaining map became the decider')
assert(state.banned.length === 2, 'both bans recorded')
assert(state.logs.length === 4, `logs cover init+ban+ban+decider (got ${state.logs.length})`)

// 5. every client saw the pushes, including the one that never spoke
assert(
  spectator.events.filter((e) => e.code === 'veto:state').length >= 3,
  `spectator received broadcasts (${spectator.events.filter((e) => e.code === 'veto:state').length})`
)
assert(
  spectator.events.at(-1).data.phase === 'choose-sides',
  'last broadcast carries the decider state'
)

// 6. side pick — decider was picked by team 0, so team 2 chooses first
assert(state.selected[0].sidePickTurn === 2, 'team 2 picks sides on the decider')
assert(
  !(await p1.call('veto:pickSide', { teamId: team1, attacker: true })).ok,
  'team 1 cannot pick sides out of turn'
)
assert((await p2.call('veto:pickSide', { teamId: team2, attacker: true })).ok, 'team 2 takes attack')

const final = (await p1.call('veto:state')).result
assert(final.selected[0].attacker === 2, 'attacker recorded as team 2')
assert(final.ended === true, 'veto ended once every map has sides')

// 7. team names broadcast
assert((await p1.call('veto:updateTeam', { teamId: team1, name: 'Sentinels' })).ok, 'team 1 renamed')
await new Promise((r) => setTimeout(r, 200))
assert(spectator.events.at(-1).data.team1 === 'Sentinels', 'rename reached the spectator')
assert(
  !(await p1.call('veto:updateTeam', { teamId: team1, name: 'x' })).ok,
  'a too-short team name is rejected by the schema'
)

// 8. an unknown veto id has no state
const ghost = open('does-not-exist')
await ghost.ready
assert(!(await ghost.call('veto:state')).ok, 'unknown veto id → error, not a crash')

;[creator, p1, p2, spectator, ghost].forEach((c) => c.close())
console.log('\nAll checks passed.')
