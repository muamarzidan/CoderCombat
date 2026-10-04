import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto'

import type { CharacterId } from '../../../shared/types.js'
import { ROOM } from './constants.js'


export interface RoomPlayer {
  userId: string
  username: string
  character: CharacterId
  socketId: string
}

export interface Room {
  code: string
  modulId: string
  host: RoomPlayer
  guest: RoomPlayer | null
  salt: Buffer
  passwordHash: Buffer
  createdAt: number
  expiresAt: number
}

export type RoomJoinResult =
  | { ok: true; room: Room }
  | {
    ok: false
    error: 'not_found' | 'full' | 'bad_password' | 'own_room' | 'wrong_module'
    modulId?: string
  }

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const KEY_LENGTH = 32
const SCRYPT = { N: 4096, r: 8, p: 1 } as const

export class RoomManager {
  private rooms: Map<string, Room> = new Map()

  create(host: RoomPlayer, modulId: string): { room: Room; password: string } {
    this.purgeExpired()

    const code = this.generateCode()
    const password = generatePassword()
    const salt = randomBytes(16)
    const passwordHash = scryptSync(password, salt, KEY_LENGTH, SCRYPT)
    const now = Date.now()

    const room: Room = {
      code,
      modulId,
      host,
      guest: null,
      salt,
      passwordHash,
      createdAt: now,
      expiresAt: now + ROOM.TTL_MS,
    }
    this.rooms.set(code, room)
    return { room, password }
  }

  join(code: string, password: string, modulId: string, guest: RoomPlayer): RoomJoinResult {
    this.purgeExpired()

    const room = this.rooms.get(normalizeCode(code))
    if (!room) return { ok: false, error: 'not_found' }
    if (!verify(password, room)) return { ok: false, error: 'bad_password' }
    if (room.modulId !== modulId) return { ok: false, error: 'wrong_module', modulId: room.modulId }
    if (room.guest) return { ok: false, error: 'full' }
    if (room.host.userId === guest.userId) return { ok: false, error: 'own_room' }

    room.guest = guest
    this.rooms.delete(room.code)
    return { ok: true, room }
  }

  leave(code: string, userId: string): void {
    const room = this.rooms.get(normalizeCode(code))
    if (!room) return
    if (room.guest?.userId === userId) {
      room.guest = null
      return
    }
    if (room.host.userId === userId) this.rooms.delete(room.code)
  }

  removeBySocket(socketId: string): void {
    for (const [code, room] of this.rooms) {
      if (room.host.socketId === socketId) this.rooms.delete(code)
    }
  }

  get size(): number {
    return this.rooms.size
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = randomCode()
      if (!this.rooms.has(code)) return code
    }
    throw new Error('Tidak bisa membuat kode room unik')
  }

  private purgeExpired(): void {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      // Only rooms still waiting for a guest expire; a live match is never cut.
      if (!room.guest && room.expiresAt <= now) this.rooms.delete(code)
    }
  }
}



// Helper

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

function randomCode(): string {
  let out = ''
  for (let i = 0; i < ROOM.CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return out
}

function generatePassword(): string {
  let out = ''
  for (let i = 0; i < ROOM.PASSWORD_LENGTH; i++) out += randomInt(10)
  return out
}

function verify(password: string, room: Room): boolean {
  const candidate = scryptSync(password, room.salt, KEY_LENGTH, SCRYPT)
  return timingSafeEqual(candidate, room.passwordHash)
}
