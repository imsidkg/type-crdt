import 'dotenv/config'
import type { Express } from 'express'
import express from 'express'
import cors from 'cors'
import { Server as HocuspocusServer } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { databaseConfig } from './persistence.js'
import routes from './routes.js'

const app: Express = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const hocuspocus = new HocuspocusServer({
  port: parseInt(process.env.WS_PORT || '4321', 10),
  extensions: [
    new Database(databaseConfig),
  ],
  async onConnect(data: { documentName: string }) {
    console.log(`Client connected to ${data.documentName}`)
  },
  async onDisconnect(data: { documentName: string }) {
    console.log(`Client disconnected from ${data.documentName}`)
  },
  async onChange(data: { documentName: string }) {
    console.log(`Document ${data.documentName} changed`)
  },
} as any)

app.use('/api', routes)

const HTTP_PORT = parseInt(process.env.HTTP_PORT || '4322', 10)

app.listen(HTTP_PORT, () => {
  console.log(`Express REST API running on port ${HTTP_PORT}`)
})

hocuspocus.listen().then(() => {
  console.log(`Hocuspocus WebSocket server running on port ${hocuspocus.address.port}`)
}).catch((err: unknown) => {
  console.error('Failed to start Hocuspocus:', err)
})

export { app, hocuspocus }
