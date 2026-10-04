import type { Request, Response, NextFunction } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'


export function createRequireAuth(supabase: SupabaseClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Autentikasi diperlukan' })
      return
    }

    const token = header.slice('Bearer '.length)
    try {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data.user) {
        res.status(401).json({ error: 'Sesi tidak valid, silakan masuk lagi' })
        return
      }
      res.locals.userId = data.user.id
      next()
    } catch (err) {
      console.error('[auth] getUser error:', err)
      res.status(500).json({ error: 'Gagal memverifikasi sesi' })
    }
  }
}
