import type { ModuleMeta, ModuleData, GradeResponse } from '../../../shared/types'
import { supabase } from './supabase'
import { API_BASE, requestJson, HttpError } from './http'

export const contentApi = {
  async listModules(): Promise<ModuleMeta[]> {
    return requestJson<ModuleMeta[]>(`${API_BASE}/content/modules`)
  },

  /**
   * Ambil modul. 404 → null ("tidak ditemukan"); error lain dilempar
   * supaya pemanggil bisa membedakan dari gangguan jaringan.
   */
  async getModule(id: string): Promise<ModuleData | null> {
    try {
      return await requestJson<ModuleData>(`${API_BASE}/content/modules/${id}`)
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null
      throw err
    }
  },

  /** Kirim jawaban ke server untuk di-grade. AnswerIndex tidak pernah dikirim ke client. */
  async gradeQuiz(modulId: string, answers: number[]): Promise<GradeResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali.')
    }

    return requestJson<GradeResponse>(`${API_BASE}/content/modules/${modulId}/grade`, {
      method: 'POST',
      body: { answers },
      token: session.access_token,
    })
  },
}
