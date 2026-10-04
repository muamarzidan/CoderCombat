import type { ModuleMeta } from '../../../shared/types'
import { contentApi } from './content'

/** Daftar modul jarang berubah → cache 3 jam agar 3 halaman langsung tampil. */
const CACHE_KEY = 'codercombat:modules:v1'
const TTL_MS = 3 * 60 * 60 * 1000

interface CachedModules {
  data: ModuleMeta[]
  savedAt: number
}

/** Validasi bentuk cache sebelum dipakai (jangan percaya isi localStorage). */
function isModuleMeta(value: unknown): value is ModuleMeta {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.title === 'string' &&
    typeof m.summary === 'string' &&
    typeof m.questionCount === 'number'
  )
}

/** Baca cache bila ada & belum kedaluwarsa; selain itu `null`. */
function readCache(): ModuleMeta[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedModules
    if (typeof parsed.savedAt !== 'number' || !Array.isArray(parsed.data)) return null
    if (Date.now() - parsed.savedAt > TTL_MS) return null
    if (!parsed.data.every(isModuleMeta)) return null
    return parsed.data
  } catch {
    // JSON rusak atau localStorage diblokir (mode privat) → anggap tak ada cache.
    return null
  }
}

function writeCache(data: ModuleMeta[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() } satisfies CachedModules))
  } catch {
    // Kuota penuh / localStorage diblokir → cache opsional, abaikan.
  }
}

/**
 * Ambil daftar modul dengan strategi stale-while-revalidate:
 * 1. Bila ada cache valid, `onCached` dipanggil lebih dulu → halaman tampil instan.
 * 2. Data segar tetap diambil dari jaringan dan menggantikan cache.
 *
 * @param onCached dipanggil sinkron bila cache valid tersedia (opsional).
 */
export async function loadModules(onCached?: (data: ModuleMeta[]) => void): Promise<ModuleMeta[]> {
  const cached = readCache()
  if (cached) onCached?.(cached)

  const fresh = await contentApi.listModules()
  writeCache(fresh)
  return fresh
}
