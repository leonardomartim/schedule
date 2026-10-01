import { describe, expect, it, vi } from 'vitest'
import { handleUsernameSignIn, type UsernameSignInDependencies } from '../supabase/functions/username-sign-in/username-handler'

function dependencies(): UsernameSignInDependencies {
  return {
    allowedOrigins: ['https://schedule.example'],
    consumeAttempt: vi.fn().mockResolvedValue(true),
    findEmail: vi.fn().mockResolvedValue('private@example.com'),
    authenticate: vi.fn().mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' }),
  }
}
const request = (body: unknown, origin = 'https://schedule.example'): Request => new Request('https://project.supabase.co/functions/v1/username-sign-in', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

describe('username authentication endpoint', () => {
  it('keeps email resolution on the server and returns only session tokens', async () => {
    const ports = dependencies()
    const response = await handleUsernameSignIn(request({ username: 'Leonardo', password: 'password' }), ports)
    expect(ports.findEmail).toHaveBeenCalledWith('leonardo')
    expect(ports.authenticate).toHaveBeenCalledWith('private@example.com', 'password')
    expect(await response.json()).toEqual({ access_token: 'access', refresh_token: 'refresh' })
  })
  it('returns the same error for unknown usernames and incorrect passwords', async () => {
    const missing = dependencies()
    vi.mocked(missing.findEmail).mockResolvedValue(null)
    vi.mocked(missing.authenticate).mockResolvedValue(null)
    const wrongPassword = dependencies()
    vi.mocked(wrongPassword.authenticate).mockResolvedValue(null)
    const first = await handleUsernameSignIn(request({ username: 'missing', password: 'password' }), missing)
    const second = await handleUsernameSignIn(request({ username: 'leonardo', password: 'wrong' }), wrongPassword)
    expect(first.status).toBe(401)
    expect(await first.json()).toEqual(await second.json())
    expect(missing.authenticate).toHaveBeenCalled()
  })
  it('throttles attempts before looking up private account details', async () => {
    const ports = dependencies()
    vi.mocked(ports.consumeAttempt).mockResolvedValue(false)
    const response = await handleUsernameSignIn(request({ username: 'leonardo', password: 'password' }), ports)
    expect(response.status).toBe(429)
    expect(ports.findEmail).not.toHaveBeenCalled()
  })
  it('rejects untrusted browser origins and invalid payloads', async () => {
    const ports = dependencies()
    expect((await handleUsernameSignIn(request({}, 'https://untrusted.example'), ports)).status).toBe(403)
    expect((await handleUsernameSignIn(request({ username: 'x', password: '' }), ports)).status).toBe(400)
    expect(ports.findEmail).not.toHaveBeenCalled()
  })
  it('does not expose backend exceptions', async () => {
    const ports = dependencies()
    vi.mocked(ports.findEmail).mockRejectedValue(new Error('private database detail'))
    const response = await handleUsernameSignIn(request({ username: 'leonardo', password: 'password' }), ports)
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private database detail')
  })
})
