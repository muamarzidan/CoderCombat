export const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const DEFAULT_TIMEOUT_MS = 15_000

export class HttpError extends Error {
  readonly status: number
  readonly field?: string

  constructor(message: string, status: number, field?: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.field = field
  }
}

export function messageOf(err: unknown): string {
  if (err instanceof HttpError) return err.message
  if (err instanceof Error) return err.message
  return 'Terjadi kesalahan tak terduga.'
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
  timeoutMs?: number
}

/**
 * @throws {HttpError} status HTTP gagal, timeout (status 0), atau koneksi gagal (status 0).
 */
export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const data: unknown = await res.json().catch(() => null)

    if (!res.ok) {
      const payload = (data ?? {}) as { error?: string; field?: string }
      throw new HttpError(payload.error || 'Terjadi kesalahan', res.status, payload.field)
    }

    return data as T
  } catch (err) {
    if (err instanceof HttpError) throw err
    if (timedOut) {
      throw new HttpError('Permintaan melebihi batas waktu. Periksa koneksi lalu coba lagi.', 0)
    }
    throw new HttpError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0)
  } finally {
    clearTimeout(timer)
  }
}
