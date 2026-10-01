import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleUsernameSignIn } from './username-handler.ts'

const projectUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://schedule-omega-ecru.vercel.app').split(',').map((origin) => origin.trim())
const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function hashLoginBucket(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve((request: Request) => handleUsernameSignIn(request, {
  allowedOrigins,
  consumeAttempt: async (username, ipAddress) => {
    const { data, error } = await admin.rpc('consume_username_login_attempt', {
      p_username_hash: await hashLoginBucket(username), p_ip_hash: await hashLoginBucket(ipAddress),
    })
    if (error) throw error
    return data === true
  },
  findEmail: async (username) => {
    const { data: profile, error } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
    if (error) throw error
    if (!profile) return null
    const { data, error: userError } = await admin.auth.admin.getUserById(profile.id)
    if (userError) throw userError
    return data.user.email ?? null
  },
  authenticate: async (email, password) => {
    // A separate non-persisting client per request prevents concurrent session crossover.
    const authClient = createClient(projectUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })
    return error || !data.session ? null : { access_token: data.session.access_token, refresh_token: data.session.refresh_token }
  },
}))
