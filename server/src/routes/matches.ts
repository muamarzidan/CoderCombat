import { Router, type Router as ExpressRouter, type RequestHandler } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchDetail } from '../../../shared/types.js'

/**
 * @param requireAuth - every endpoint requires a valid session.
 * @param supabase - service client (bypasses RLS so we can read `detail`).
 */
export function createMatchesRouter(requireAuth: RequestHandler, supabase: SupabaseClient): ExpressRouter {
  const router: ExpressRouter = Router()

  router.get('/:id', requireAuth, async (req, res) => {
    const userId = res.locals.userId as string
    const { id } = req.params

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, module_id, player_a_id, player_b_id, winner_id, hp_a, hp_b, reason, created_at, detail')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Duel tidak ditemukan' })

      if (data.player_a_id !== userId && data.player_b_id !== userId) {
        return res.status(403).json({ error: 'Kamu tidak ikut dalam duel ini' })
      }

      return res.json({
        id: data.id,
        moduleId: data.module_id,
        winnerId: data.winner_id,
        hpA: data.hp_a,
        hpB: data.hp_b,
        reason: data.reason,
        createdAt: data.created_at,
        detail: (data.detail ?? null) as MatchDetail | null,
      })
    } catch (err) {
      console.error('[matches] get error:', err)
      return res.status(500).json({ error: 'Gagal memuat hasil duel' })
    }
  })

  return router
}
