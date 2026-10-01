import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAccount, signInAccount, startGoogleSignIn, saveAccountPreferences } from '../src/account/account-service'
import { verifyGoogleProviderEnabled } from '../src/account/google-provider'

vi.mock('../src/account/google-provider', () => ({ verifyGoogleProviderEnabled: vi.fn() }))
beforeEach(() => { vi.mocked(verifyGoogleProviderEnabled).mockResolvedValue(undefined) })

function accountClient() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null })
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: { access_token: 'access', refresh_token: 'refresh' }, error: null }) },
    from: vi.fn(() => ({ update })), update, eq, single,
  }
}

describe('Supabase account integration', () => {
  it('registers the normalized username and email with an explicit confirmation return URL', async () => {
    const client = accountClient()
    await registerAccount(client, { username: ' Leonardo ', email: ' Leo@example.com ', password: 'long-password' }, 'https://schedule.example/')
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'leo@example.com', password: 'long-password', options: {
      data: { username: 'leonardo' }, emailRedirectTo: 'https://schedule.example/',
    } })
  })
  it('uses email sign-in directly and resolves username sign-in through the server', async () => {
    const client = accountClient()
    await signInAccount(client, ' Leo@example.com ', 'password')
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'leo@example.com', password: 'password' })
    await signInAccount(client, ' Leonardo ', 'password')
    expect(client.functions.invoke).toHaveBeenCalledWith('username-sign-in', { body: { username: 'leonardo', password: 'password' } })
    expect(client.auth.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' })
  })
  it('starts a real Google OAuth redirect', async () => {
    const client = accountClient()
    await startGoogleSignIn(client, 'https://schedule.example/')
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://schedule.example/' } })
  })
  it('does not navigate to the Supabase error page when Google is disabled', async () => {
    const client = accountClient()
    vi.mocked(verifyGoogleProviderEnabled).mockRejectedValue(new Error('Google sign-in is not enabled for this site yet.'))
    await expect(startGoogleSignIn(client, 'https://schedule.example/')).rejects.toThrow('not enabled')
    expect(client.auth.signInWithOAuth).not.toHaveBeenCalled()
  })
  it('does not hide provider errors or create a session on failed login', async () => {
    const client = accountClient()
    client.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })
    await expect(signInAccount(client, 'leo@example.com', 'wrong')).rejects.toThrow('Invalid login credentials')
    expect(client.auth.setSession).not.toHaveBeenCalled()
  })
  it('persists all three preferences only for the signed-in account and checks a row was updated', async () => {
    const client = accountClient()
    const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const
    await saveAccountPreferences(client, 'user-1', preferences)
    expect(client.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(client.update).toHaveBeenCalledWith({ preferences })
    client.single.mockResolvedValue({ data: null, error: { message: 'Profile missing' } })
    await expect(saveAccountPreferences(client, 'user-1', preferences)).rejects.toThrow('Profile missing')
  })
})
