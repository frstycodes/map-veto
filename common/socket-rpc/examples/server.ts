import { createProcedure, WebsocketHandler } from '../server'
import { z } from 'zod'

export type Ctx = {
  userId: string
  room: string
}

const base = createProcedure<Ctx>()

export const router = {
  ping: base.input(z.object({ message: z.string() })).handler(function* (c) {
    return { pong: c.input.message }
  }),

  sendMessage: base.input(z.object({ text: z.string() })).handler(function* (c) {
    yield* [1, 2, 3, 4].map((n) => c.reply('number', { number: n }))
    yield c.reply('message', { text: c.input.text, from: c.userId })
    yield c.reply('ack', { delivered: true })
    return { ok: true }
  })
}

export const handler = new WebsocketHandler(router, {
  onOpen: function* ({ ctx }) {
    yield ctx.replyAll('presence', { userId: ctx.userId, room: ctx.room, status: 'online' })
  },
  onClose: function* ({ ctx }) {
    yield ctx.replyAll('presence', { userId: ctx.userId, room: ctx.room, status: 'offline' })
  }
})

export type AppRouter = typeof router
export type AppHandler = typeof handler
