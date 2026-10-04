import { Router, type Router as ExpressRouter, type RequestHandler } from 'express'
import { createClient } from '@supabase/supabase-js'

import { RateLimiter } from '../lib/rateLimit.js'
import { isCharacterId, DEFAULT_CHARACTER_ID } from '../../../shared/constants.js'


const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const MIN_PASSWORD = 8

const passwordLimiter = new RateLimiter(5, 60_000)

/**
 * @param requireAuth - applied to the profile endpoints (username/password).
 */
export function createAuthRouter(requireAuth: RequestHandler): ExpressRouter {
  const router: ExpressRouter = Router();
  router.post('/login-username', async (req, res) => {
    const { identifier, password } = req.body ?? {}
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier dan password diperlukan' })
    }

    try {
      let email = identifier
      if (!identifier.includes('@')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', identifier)
          .single()

        if (profileError || !profile) {
          return res.status(401).json({ error: 'Username atau password salah' })
        }

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id)
        if (userError || !userData.user?.email) {
          return res.status(401).json({ error: 'Username atau password salah' })
        }

        email = userData.user.email
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session) {
        return res.status(401).json({ error: 'Username atau password salah' })
      }

      return res.json({ session: data.session, user: data.user })
    } catch (err) {
      console.error('Login error:', err)
      return res.status(500).json({ error: 'Terjadi kesalahan server' })
    }
  })

  router.post('/register', async (req, res) => {
    const { email, username, password, character } = req.body ?? {}
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, dan password diperlukan' })
    }

    const cleanUsername = username.trim().toLowerCase()
    if (!USERNAME_RE.test(cleanUsername)) {
      return res.status(400).json({
        error: 'Username harus 3-20 karakter, hanya huruf kecil, angka, dan underscore',
        field: 'username',
      })
    }

    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password minimal ${MIN_PASSWORD} karakter`, field: 'password' })
    }

    const cleanCharacter = isCharacterId(character) ? character : DEFAULT_CHARACTER_ID

    try {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle()

      if (taken) {
        return res.status(409).json({ error: 'Username sudah dipakai', field: 'username' })
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: cleanUsername },
      })

      if (error || !data.user) {
        const msg = error?.message ?? 'Gagal membuat akun'
        if (/email/i.test(msg)) {
          return res.status(409).json({ error: msg, field: 'email' })
        }
        return res.status(400).json({ error: msg })
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username: cleanUsername, character: cleanCharacter })

      if (profileError) {
        await supabase.auth.admin.deleteUser(data.user.id)
        console.error('Profile insert error:', profileError)
        return res.status(500).json({ error: 'Gagal membuat profile' })
      }

      const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signinError || !signinData.session) {
        return res.status(500).json({ error: 'Akun dibuat tapi gagal login otomatis' })
      }

      return res.json({ session: signinData.session, user: signinData.user })
    } catch (err) {
      console.error('Register error:', err)
      return res.status(500).json({ error: 'Terjadi kesalahan server' })
    }
  })

  router.get('/check-username', async (req, res) => {
    const username = String(req.query.username ?? '').trim().toLowerCase()
    if (!username) return res.json({ available: false, suggestions: [] })

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle()

      const available = !data
      const suggestions: string[] = []
      if (!available) {
        for (const suf of ['1', '2', '3', '_id', '_pro']) {
          const candidate = `${username}${suf}`
          const { data: dupe } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', candidate)
            .maybeSingle()
          if (!dupe) {
            suggestions.push(candidate)
            if (suggestions.length >= 3) break
          }
        }
      }

      return res.json({ available, suggestions })
    } catch (err) {
      console.error('Check username error:', err)
      return res.status(500).json({ error: 'Gagal cek username' })
    }
  })

  router.post('/username', requireAuth, async (req, res) => {
    const userId = res.locals.userId as string
    const raw = String(req.body?.username ?? '').trim().toLowerCase()

    if (!USERNAME_RE.test(raw)) {
      return res.status(400).json({
        error: 'Username harus 3-20 karakter, hanya huruf kecil, angka, dan underscore',
        field: 'username',
      })
    }

    try {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', raw)
        .neq('id', userId)
        .maybeSingle()

      if (taken) {
        return res.status(409).json({ error: 'Username sudah dipakai', field: 'username' })
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: raw })
        .eq('id', userId)

      if (profileError) {
        if (/duplicate|unique/i.test(profileError.message)) {
          return res.status(409).json({ error: 'Username sudah dipakai', field: 'username' })
        }
        console.error('Update username error:', profileError)
        return res.status(500).json({ error: 'Gagal mengganti username' })
      }

      const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { username: raw },
      })
      if (metaError) console.error('Update user_metadata error:', metaError)

      return res.json({ username: raw })
    } catch (err) {
      console.error('Change username error:', err)
      return res.status(500).json({ error: 'Terjadi kesalahan server' })
    }
  })

  router.post('/character', requireAuth, async (req, res) => {
    const userId = res.locals.userId as string
    const raw = req.body?.character

    if (!isCharacterId(raw)) {
      return res.status(400).json({ error: 'Karakter tidak valid', field: 'character' })
    }

    try {
      const { error } = await supabase.from('profiles').update({ character: raw }).eq('id', userId)
      if (error) {
        console.error('Update character error:', error)
        return res.status(500).json({ error: 'Gagal mengganti karakter' })
      }
      return res.json({ character: raw })
    } catch (err) {
      console.error('Change character error:', err)
      return res.status(500).json({ error: 'Terjadi kesalahan server' })
    }
  })

  router.post('/password', requireAuth, async (req, res) => {
    const userId = res.locals.userId as string
    const currentPassword = String(req.body?.currentPassword ?? '')
    const newPassword = String(req.body?.newPassword ?? '')

    if (!passwordLimiter.allow(userId)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' })
    }

    if (newPassword.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password baru minimal ${MIN_PASSWORD} karakter`, field: 'newPassword' })
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'Password baru harus berbeda dari password lama', field: 'newPassword' })
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
      const email = userData?.user?.email
      if (userError || !email) {
        return res.status(400).json({ error: 'Akun tidak ditemukan' })
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (verifyError) {
        return res.status(401).json({ error: 'Password lama salah', field: 'currentPassword' })
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
      if (updateError) {
        console.error('Update password error:', updateError)
        return res.status(500).json({ error: 'Gagal mengganti password' })
      }

      passwordLimiter.reset(userId)
      return res.json({ ok: true })
    } catch (err) {
      console.error('Change password error:', err)
      return res.status(500).json({ error: 'Terjadi kesalahan server' })
    }
  })

  return router
}

export default createAuthRouter
