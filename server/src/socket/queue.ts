import type { QueueEntry } from '../../../shared/types.js'


export class QueueManager {
  private queue: Map<string, QueueEntry> = new Map()
  private onMatch: (modulId: string, p1: QueueEntry, p2: QueueEntry) => void

  constructor(onMatch: (modulId: string, p1: QueueEntry, p2: QueueEntry) => void) {
    this.onMatch = onMatch
  }

  join(entry: QueueEntry): 'queued' | 'matched' {
    const key = `${entry.modulId}:${entry.userId}`
    if (this.queue.has(key)) return 'queued'

    const opponent = this.findOpponent(entry.modulId, entry.userId)
    if (opponent) {
      this.queue.delete(`${entry.modulId}:${opponent.userId}`)
      this.onMatch(entry.modulId, opponent, entry)
      return 'matched'
    }

    this.queue.set(key, entry)
    return 'queued'
  }

  leave(modulId: string, userId: string): void {
    this.queue.delete(`${modulId}:${userId}`)
  }

  removeBySocket(socketId: string): void {
    for (const [key, entry] of this.queue) {
      if (entry.socketId === socketId) {
        this.queue.delete(key)
        break
      }
    }
  }

  private findOpponent(modulId: string, excludeUserId: string): QueueEntry | undefined {
    for (const entry of this.queue.values()) {
      if (entry.modulId === modulId && entry.userId !== excludeUserId) return entry
    }
    return undefined
  }

  get size(): number {
    return this.queue.size
  }
}
