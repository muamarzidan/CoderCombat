import { io, type Socket } from 'socket.io-client'
import { SERVER_URL } from './http'

/**
 * Single shared socket for the whole app.
 *
 * Why a module singleton: the socket must survive client-side navigation
 * (Antrean → Duel → Hasil). A per-page socket would disconnect on unmount,
 * which the server now treats as a real disconnect (grace-period pause).
 */
let socket: Socket | null = null
let token: string | null = null

/** Get (or lazily create) the shared socket, keeping its auth token in sync. */
export function getSocket(nextToken: string | null): Socket {
  if (!socket) {
    token = nextToken
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: nextToken ? { token: nextToken } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    })
    return socket
  }

  if (nextToken !== token) {
    token = nextToken
    socket.auth = nextToken ? { token: nextToken } : {}
    if (nextToken) {
      if (!socket.connected) socket.connect()
    } else {
      // Logged out - no reason to keep the channel open.
      socket.disconnect()
    }
  }

  return socket
}
