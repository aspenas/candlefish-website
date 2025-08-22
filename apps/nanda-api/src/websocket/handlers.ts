import { FastifyInstance } from 'fastify'

export function setupWebSocketHandlers(app: FastifyInstance, context: any) {
  // WebSocket handler for real-time updates
  app.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection) => {
      connection.socket.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to NANDA Index WebSocket'
      }))

      connection.socket.on('message', (message) => {
        // Echo back for now
        connection.socket.send(JSON.stringify({
          type: 'echo',
          data: message.toString()
        }))
      })
    })
  })
}