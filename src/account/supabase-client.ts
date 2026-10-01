import { createClient } from '@supabase/supabase-js'
import { supabaseConfiguration } from './supabase-configuration'

export const supabase = supabaseConfiguration ? createClient(supabaseConfiguration.url, supabaseConfiguration.publicKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
}) : null

export function accountReturnUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}
