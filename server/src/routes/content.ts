import { Router, type Router as ExpressRouter, type RequestHandler } from 'express'
import { readFile } from 'fs/promises'
import { join } from 'path'

import type { ModuleContent, ModuleMeta, Unit } from '../../../shared/types.js'
import { MODULE_IDS, isModuleId } from '../../../shared/constants.js'


const CONTENT_DIR = process.env.CONTENT_DIR || join(process.cwd(), '..', 'content')

/**
 * @param requireAuth - applied ONLY to /grade (answer key lives in its response).
 */
export function createContentRouter(requireAuth: RequestHandler): ExpressRouter {
  const router: ExpressRouter = Router()

  router.get('/modules', async (_req, res) => {
    try {
      const metas: ModuleMeta[] = []
      for (const id of MODULE_IDS) {
        const raw = await readFile(join(CONTENT_DIR, `${id}.json`), 'utf-8')
        const data: ModuleContent = JSON.parse(raw)
        metas.push({
          id: data.id,
          title: data.title,
          summary: data.summary,
          questionCount: data.questions.length,
        })
      }
      res.json(metas)
    } catch (err) {
      console.error('[content] listModules error:', err)
      res.status(500).json({ error: 'Gagal memuat modul' })
    }
  })

  router.get('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params
      if (!isModuleId(id)) {
        return res.status(404).json({ error: 'Modul tidak ditemukan' })
      }

      const raw = await readFile(join(CONTENT_DIR, `${id}.json`), 'utf-8')
      const data = JSON.parse(raw) as Omit<ModuleContent, 'units'> & { units: Unit[] }
      const clientQuestions = data.questions.map(({ answerIndex, ...rest }) => rest)

      res.json({
        id: data.id,
        title: data.title,
        summary: data.summary,
        units: data.units,
        questions: clientQuestions,
      })
    } catch (err) {
      console.error('[content] getModule error:', err)
      res.status(500).json({ error: 'Gagal memuat modul' })
    }
  })

  router.post('/modules/:id/grade', requireAuth, async (req, res) => {
    try {
      const { id } = req.params
      const moduleId = Array.isArray(id) ? id[0] : id
      const { answers } = req.body as { answers?: unknown }

      if (!moduleId || !isModuleId(moduleId)) {
        return res.status(404).json({ error: 'Modul tidak ditemukan' })
      }
      if (!Array.isArray(answers) || answers.length > 100) {
        return res.status(400).json({ error: 'answers harus array number' })
      }
      if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a < 10)) {
        return res.status(400).json({ error: 'Format jawaban tidak valid' })
      }

      const raw = await readFile(join(CONTENT_DIR, `${moduleId}.json`), 'utf-8')
      const data: ModuleContent = JSON.parse(raw)

      if (answers.length !== data.questions.length) {
        return res.status(400).json({ error: 'Jumlah jawaban tidak cocok dengan jumlah soal' })
      }

      const results = data.questions.map((q, idx) => {
        const userAnswer = answers[idx] as number
        const isCorrect = userAnswer === q.answerIndex
        return {
          questionIndex: idx,
          questionText: q.text,
          options: q.options,
          userAnswer,
          correctAnswer: q.answerIndex,
          isCorrect,
          explanation: q.explanation ?? '',
        }
      })

      const correct = results.filter((r) => r.isCorrect).length
      const total = results.length
      const percentage = Math.round((correct / total) * 100)

      res.json({
        moduleId,
        score: { correct, total, percentage },
        results,
      })
    } catch (err) {
      console.error('[content] grade error:', err)
      res.status(500).json({ error: 'Gagal menilai kuis' })
    }
  })

  return router
}
