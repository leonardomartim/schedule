import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveSupabaseConfiguration } from '../src/account/supabase-configuration'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('production Supabase configuration', () => {
  it('uses a complete explicit project override, including legacy anon keys', () => {
    expect(resolveSupabaseConfiguration({ VITE_SUPABASE_URL: ' https://other.supabase.co ', VITE_SUPABASE_PUBLISHABLE_KEY: ' other-key ' }))
      .toEqual({ url: 'https://other.supabase.co', publicKey: 'other-key' })
    expect(resolveSupabaseConfiguration({ VITE_SUPABASE_URL: 'https://other.supabase.co', VITE_SUPABASE_ANON_KEY: 'legacy-key' }))
      .toEqual({ url: 'https://other.supabase.co', publicKey: 'legacy-key' })
  })
  it('does not mix a partial project override with the default credentials', () => {
    expect(resolveSupabaseConfiguration({ VITE_SUPABASE_URL: 'https://other.supabase.co' })).toBeNull()
    expect(resolveSupabaseConfiguration({ VITE_SUPABASE_PUBLISHABLE_KEY: 'other-key' })).toBeNull()
  })
  it('initializes the project client when deployment environment variables are absent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.resetModules()
    const { supabase } = await import('../src/account/supabase-client')
    expect(supabase).not.toBeNull()
  })
})
