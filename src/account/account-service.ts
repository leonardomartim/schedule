import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyGoogleProviderEnabled } from './google-provider'
import { accountErrorMessage, parsePreferences, validateRegistration, type EventPreferences, type RegistrationFields } from './account-validation'

type AccountClient = Pick<SupabaseClient, 'auth' | 'functions' | 'from'>

export interface AccountProfile {
  id: string
  username: string | null
  display_name: string | null
  preferences: EventPreferences | null
}

function throwAccountError(error: unknown): void {
  if (error) throw new Error(accountErrorMessage(error))
}

export async function registerAccount(client: AccountClient, fields: RegistrationFields, redirectTo: string) {
  const validation = validateRegistration(fields)
  if (validation) throw new Error(validation)
  const { data, error } = await client.auth.signUp({
    email: fields.email.trim().toLowerCase(), password: fields.password,
    options: { data: { username: fields.username.trim().toLowerCase() }, emailRedirectTo: redirectTo },
  })
  throwAccountError(error)
  return data
}

export async function signInAccount(client: AccountClient, identifier: string, password: string): Promise<void> {
  const normalized = identifier.trim().toLowerCase()
  if (normalized.includes('@')) {
    const { error } = await client.auth.signInWithPassword({ email: normalized, password })
    throwAccountError(error)
    return
  }
  const { data, error } = await client.functions.invoke('username-sign-in', { body: { username: normalized, password } })
  if (error || !data?.access_token || !data?.refresh_token) {
    throw new Error('Unable to sign in. Check your username and password, confirm your email, or try your email address.')
  }
  const { error: sessionError } = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
  throwAccountError(sessionError)
}

export async function startGoogleSignIn(client: AccountClient, redirectTo: string): Promise<void> {
  await verifyGoogleProviderEnabled()
  const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  throwAccountError(error)
}

export async function loadAccountProfile(client: AccountClient, userId: string): Promise<AccountProfile> {
  const { data, error } = await client.from('profiles').select('id, username, display_name, preferences').eq('id', userId).single()
  throwAccountError(error)
  if (!data) throw new Error('Your profile could not be loaded. Please try again.')
  return { id: data.id, username: data.username, display_name: data.display_name, preferences: parsePreferences(data.preferences) }
}

export async function saveAccountPreferences(client: AccountClient, userId: string, preferences: EventPreferences): Promise<void> {
  if (!parsePreferences(preferences)) throw new Error('Please answer all three preference questions.')
  const { data, error } = await client.from('profiles').update({ preferences }).eq('id', userId).select('id').single()
  throwAccountError(error)
  if (!data) throw new Error('Your preferences were not saved. Please try again.')
}
