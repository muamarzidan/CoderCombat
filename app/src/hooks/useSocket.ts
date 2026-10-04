import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { useAuth } from './useAuth'
import { getSocket } from '../lib/socket'

/**
 * Subscribe to the shared socket's connection state.
 * The underlying socket is a singleton (see lib/socket.ts) so it persists
 * across navigation; only the listeners here are per-mount.
 */
export function useSocket(): { socket: Socket | null; connected: boolean } {
  const { session } = useAuth()
  const token = session?.access_token ?? null
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = getSocket(token)
    setSocket(s)
    setConnected(s.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [token])

  return { socket, connected }
}
