import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { SERVER_URL, requestJson, messageOf, HttpError } from '../lib/http'
import type { CharacterId } from '../../../shared/types'
import { DEFAULT_CHARACTER_ID } from '../../../shared/constants'
import type { User, Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  username: string
  character: CharacterId
  created_at: string
}

interface AuthResult {
  error: string | null
  field?: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  init: () => Promise<void>
  signIn: (identifier: string, password: string) => Promise<AuthResult>
  signUp: (email: string, username: string, password: string, character: CharacterId) => Promise<AuthResult>
  signOut: () => Promise<void>
  changeUsername: (username: string) => Promise<AuthResult>
  changeCharacter: (character: CharacterId) => Promise<AuthResult>
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>
}

interface AuthSessionResponse {
  session?: { access_token: string; refresh_token: string }
  user?: User
}

const initialState = {
  user: null,
  profile: null,
  session: null,
  loading: true,
}

// Cegah langganan ganda: React StrictMode memanggil effect dua kali saat dev.
let initStarted = false

export const useAuth = create<AuthState>((set) => {
  /**
   * Simpan sesi ke store SEGERA setelah login/daftar - sebelum navigate().
   * Tanpa ini, RequireAuth di halaman tujuan membaca `user` yang masih null
   * dan memantulkan user kembali ke /masuk (redirect balik gagal).
   */
  async function applySession(session: Session): Promise<void> {
    const profile = await fetchProfile(session.user.id)
    set({ user: session.user, session, profile, loading: false })
  }

  /** Tukar token dari server menjadi sesi Supabase di klien. */
  async function adoptSession(tokens: {
    access_token: string
    refresh_token: string
  }): Promise<Session | null> {
    const { data, error } = await supabase.auth.setSession(tokens)
    if (error || !data.session) return null
    return data.session
  }

  return {
    ...initialState,

    init: async () => {
      if (initStarted) return
      initStarted = true

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          set({ user: session.user, session, profile, loading: false })
        } else {
          set({ loading: false })
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id)
            set({ user: session.user, session, profile, loading: false })
          } else {
            // Jangan reset ke initialState - itu mengembalikan `loading` ke true
            // sehingga halaman terjebak spinner. Cukup bersihkan sesi.
            set({ user: null, session: null, profile: null, loading: false })
          }
        })
      } catch (err) {
        console.error('Auth init error:', err)
        set({ loading: false })
      }
    },

    signIn: async (identifier, password) => {
      try {
        const data = await requestJson<AuthSessionResponse>(`${SERVER_URL}/api/auth/login-username`, {
          method: 'POST',
          body: { identifier, password },
        })
        if (!data.session) return { error: 'Sesi login tidak diterima.' }

        const session = await adoptSession(data.session)
        if (!session) return { error: 'Gagal memproses sesi masuk.' }

        await applySession(session)
        return { error: null }
      } catch (err) {
        return { error: messageOf(err) }
      }
    },

    signUp: async (email, username, password, character) => {
      try {
        const data = await requestJson<AuthSessionResponse>(`${SERVER_URL}/api/auth/register`, {
          method: 'POST',
          body: { email, username: username.toLowerCase(), password, character },
        })
        if (!data.session) return { error: 'Akun dibuat tapi sesi tidak diterima.' }

        const session = await adoptSession(data.session)
        if (!session) return { error: 'Akun dibuat tapi gagal login otomatis.' }

        await applySession(session)
        return { error: null }
      } catch (err) {
        return {
          error: messageOf(err),
          field: err instanceof HttpError ? err.field : undefined,
        }
      }
    },

    signOut: async () => {
      await supabase.auth.signOut()
      set({ user: null, session: null, profile: null })
    },

    changeUsername: async (username) => {
      const token = useAuth.getState().session?.access_token
      if (!token) return { error: 'Sesi login tidak ditemukan. Silakan masuk lagi.' }
      try {
        const data = await requestJson<{ username: string }>(`${SERVER_URL}/api/auth/username`, {
          method: 'POST',
          body: { username: username.toLowerCase() },
          token,
        })
        // Server updated the DB + user_metadata; refresh both in the store so
        // the navbar and profile page reflect the new name immediately.
        const { data: userData } = await supabase.auth.getUser()
        set((state) => ({
          profile: state.profile ? { ...state.profile, username: data.username } : state.profile,
          user: userData.user ?? state.user,
        }))
        return { error: null }
      } catch (err) {
        return {
          error: messageOf(err),
          field: err instanceof HttpError ? err.field : undefined,
        }
      }
    },

    changeCharacter: async (character) => {
      const token = useAuth.getState().session?.access_token
      if (!token) return { error: 'Sesi login tidak ditemukan. Silakan masuk lagi.' }
      try {
        const data = await requestJson<{ character: CharacterId }>(`${SERVER_URL}/api/auth/character`, {
          method: 'POST',
          body: { character },
          token,
        })
        set((state) => ({
          profile: state.profile ? { ...state.profile, character: data.character } : state.profile,
        }))
        return { error: null }
      } catch (err) {
        return { error: messageOf(err) }
      }
    },

    changePassword: async (currentPassword, newPassword) => {
      const token = useAuth.getState().session?.access_token
      if (!token) return { error: 'Sesi login tidak ditemukan. Silakan masuk lagi.' }
      try {
        await requestJson<{ ok: true }>(`${SERVER_URL}/api/auth/password`, {
          method: 'POST',
          body: { currentPassword, newPassword },
          token,
        })
        return { error: null }
      } catch (err) {
        return {
          error: messageOf(err),
          field: err instanceof HttpError ? err.field : undefined,
        }
      }
    },
  }
})

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (!data) return null
  // Fall back to the default if the column is missing (migration not yet run),
  // so the UI never renders an undefined character.
  return { ...data, character: data.character ?? DEFAULT_CHARACTER_ID } as Profile
}
