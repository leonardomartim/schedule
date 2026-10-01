import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyGoogleProviderEnabled } from '../src/account/google-provider'

afterEach(() => vi.unstubAllGlobals())

describe('Google provider availability', () => {
  it('checks public settings before allowing sign-in', async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ external: { google: true } }))
    vi.stubGlobal('fetch', request)
    await expect(verifyGoogleProviderEnabled('https://project.supabase.co/', 'public-key')).resolves.toBeUndefined()
    expect(request).toHaveBeenCalledWith('https://project.supabase.co/auth/v1/settings', expect.objectContaining({
      headers: { apikey: 'public-key' }, cache: 'no-store', credentials: 'omit', signal: expect.any(AbortSignal),
    }))
  })
  it('explains disabled Google and rechecks after the owner enables it', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ external: { google: false } }))
      .mockResolvedValueOnce(Response.json({ external: { google: true } })))
    await expect(verifyGoogleProviderEnabled('https://project.supabase.co', 'public-key')).rejects.toThrow('not enabled')
    await expect(verifyGoogleProviderEnabled('https://project.supabase.co', 'public-key')).resolves.toBeUndefined()
  })
  it('keeps network and malformed responses distinct from a disabled provider', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ external: {} }))
    vi.stubGlobal('fetch', request)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(verifyGoogleProviderEnabled('https://project.supabase.co', 'public-key')).rejects.toThrow('Could not check')
    }
  })
  it('does not send a request without project configuration', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    await expect(verifyGoogleProviderEnabled('', '')).rejects.toThrow('not configured')
    expect(request).not.toHaveBeenCalled()
  })
})
