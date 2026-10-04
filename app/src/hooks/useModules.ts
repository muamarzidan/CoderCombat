import { useEffect, useState } from 'react'
import type { ModuleMeta } from '../../../shared/types'
import { loadModules } from '../lib/moduleCache'
import { messageOf } from '../lib/http'

interface UseModulesResult {
  modules: ModuleMeta[]
  loading: boolean
  error: string
}

/**
 * Daftar modul untuk halaman pemilih (Modul, Kuis, Duel, Peringkat).
 *
 * Memakai cache localStorage (TTL 3 jam) dengan stale-while-revalidate: bila
 * cache ada, data tampil seketika lalu diperbarui diam-diam di belakang. Error
 * hanya ditampilkan ketika memang belum ada data sama sekali - agar cache yang
 * sudah tampil tidak digantikan pesan error saat refresh jaringan gagal.
 */
export function useModules(): UseModulesResult {
  const [modules, setModules] = useState<ModuleMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let hadCache = false

    setLoading(true)
    setError('')

    loadModules((cached) => {
      if (cancelled) return
      hadCache = true
      setModules(cached)
      setLoading(false)
    })
      .then((fresh) => {
        if (cancelled) return
        setModules(fresh)
        setError('')
      })
      .catch((err) => {
        if (cancelled || hadCache) return
        setError(messageOf(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { modules, loading, error }
}
