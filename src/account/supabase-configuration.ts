export interface SupabasePublicConfiguration { url: string; publicKey: string }
interface SupabaseEnvironment {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
}

// Public browser credentials for this Schedule project, protected by Supabase RLS.
// Never put a service-role key, OAuth secret, or database password here.
const scheduleProjectConfiguration: SupabasePublicConfiguration = {
  url: 'https://opxcfxpdslvexjfzqbjm.supabase.co',
  publicKey: 'sb_publishable_JVgJ9-jgvZyV653jOkl9ww_xWOkPl8a',
}

export function resolveSupabaseConfiguration(environment: SupabaseEnvironment): SupabasePublicConfiguration | null {
  const url = environment.VITE_SUPABASE_URL?.trim()
  const publicKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || environment.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url && !publicKey) return scheduleProjectConfiguration
  // An override must provide both values; never mix credentials from two projects.
  return url && publicKey ? { url, publicKey } : null
}

export const supabaseConfiguration = resolveSupabaseConfiguration(import.meta.env)
