import type { AppHandler } from './server'
import { createClient } from '../client'

const client = createClient<AppHandler>('ws://localhost:3000?userId=alice&room=lobby', {
  reconnect: true,
  onOpen: () => console.log('connected'),
  onClose: () => console.log('disconnected')
})

// RPC OVER WEBSOCKETS
const pong = await client.send('ping', { message: 'hello' })
console.log(pong)
const ack = await client.send('sendMessage', { text: 'hi everyone' })
console.log(ack)

// client.on("numb")
// EVENT LISTENERS
const unsubMessage = client.on('message', (data) => {
  console.log(`${data.text}: ${data.from}`)
})

client.on('presence', (data) => {
  console.log(`${data.userId} is ${data.status} in ${data.room}`)
})

client.on('ack', (data) => {
  console.log('ack', data.delivered)
})

const EVENTS = {
  gameState: 'GAME_STATE'
}
