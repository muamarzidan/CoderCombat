import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

import { createContentRouter } from './routes/content.js'
import { createMatchesRouter } from './routes/matches.js'
import { createAuthRouter } from './routes/auth.js'
import { createRequireAuth } from './middleware/auth.js'
import { SocketManager } from './socket/index.js'


const PORT = process.env.PORT || 3001
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  SUPABASE_URL atau SUPABASE_SERVICE_KEY belum diisi - auth socket tidak akan berfungsi.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const PING_INTERVAL_MS = 2_000
const PING_TIMEOUT_MS = 3_000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
  pingInterval: PING_INTERVAL_MS,
  pingTimeout: PING_TIMEOUT_MS,
})

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))
app.use(express.json())

const requireAuth = createRequireAuth(supabase)
app.use('/api/content', createContentRouter(requireAuth))
app.use('/api/matches', createMatchesRouter(requireAuth, supabase))
app.use('/api/auth', createAuthRouter(requireAuth))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) {
    console.log('[socket] unauthenticated connection')
    return next()
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.log('[socket] auth failed:', error?.message)
      return next(new Error('Unauthorized'))
    }
    socket.data.userId = user.id
    console.log(`[socket] authenticated: ${user.id}`)
    next()
  } catch (err) {
    console.error('[socket] auth error:', err)
    next(new Error('Auth error'))
  }
})

const socketManager = new SocketManager(io, supabase)

io.on('connection', (socket) => {
  socketManager.handleConnection(socket)
})

httpServer.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`)
})
