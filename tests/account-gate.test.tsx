// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountGate } from '../src/account/AccountGate'
import { loadAccountProfile, saveAccountPreferences } from '../src/account/account-service'

interface TestSession { user: { id: string } }
const auth = vi.hoisted(() => ({
  session: { user: { id: 'first' } } as TestSession | null,
  callback: (_event: string, _session: TestSession | null): void => undefined,
  signOut: vi.fn(),
  initialize: vi.fn(),
}))
vi.mock('../src/account/supabase-client', () => ({
  accountReturnUrl: () => 'https://schedule.example/',
  supabase: { auth: {
    initialize: auth.initialize,
    getSession: async () => ({ data: { session: auth.session }, error: null }),
    onAuthStateChange: (callback: typeof auth.callback) => { auth.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } },
    signOut: auth.signOut,
  } },
}))
vi.mock('../src/account/account-service', () => ({
  loadAccountProfile: vi.fn(), saveAccountPreferences: vi.fn(), registerAccount: vi.fn(), signInAccount: vi.fn(), startGoogleSignIn: vi.fn(),
}))

const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const
beforeEach(() => { auth.session = { user: { id: 'first' } }; vi.clearAllMocks(); auth.initialize.mockResolvedValue({ error: null }) })
afterEach(cleanup)
const renderGate = (): void => {
  render(<AccountGate>{(account) => <div><h1>Workspace for {account.displayName}</h1><button onClick={() => void account.onSignOut()}>Sign out</button></div>}</AccountGate>)
}

describe('authenticated workspace gating', () => {
  it('passes an authentication callback failure to the public homepage', async () => {
    auth.session = null
    auth.initialize.mockResolvedValue({ error: { message: 'Invalid confirmation link' } })
    render(<AccountGate signedOutContent={(_authScreen, authenticationError) => <div role="alert">{authenticationError}</div>}>{() => null}</AccountGate>)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Invalid confirmation link'))
  })
  it('shows expired confirmation or OAuth callback errors instead of silently showing a blank sign-in form', async () => {
    auth.session = null
    auth.initialize.mockResolvedValue({ error: { message: 'Invalid confirmation link' } })
    renderGate()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Invalid confirmation link')
  })
  it('restores the session and loads saved preferences without repeating onboarding', async () => {
    vi.mocked(loadAccountProfile).mockResolvedValue({ id: 'first', username: 'leonardo', display_name: null, preferences })
    renderGate()
    expect(await screen.findByRole('heading', { name: 'Workspace for leonardo' })).toBeTruthy()
    expect(screen.queryByText('What are you into?')).toBeNull()
  })
  it('requires all three answers for a new Google or password profile and saves before entering', async () => {
    vi.mocked(loadAccountProfile).mockResolvedValue({ id: 'first', username: null, display_name: 'Google User', preferences: null })
    vi.mocked(saveAccountPreferences).mockResolvedValue(undefined)
    renderGate()
    await screen.findByRole('button', { name: 'Find my events' })
    expect(screen.queryByText('Workspace for Google User')).toBeNull()
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Music'))
    await user.selectOptions(screen.getByLabelText('Travel distance'), '25')
    await user.click(screen.getByLabelText('Free events'))
    await user.click(screen.getByRole('button', { name: 'Find my events' }))
    expect(await screen.findByText('Workspace for Google User')).toBeTruthy()
    expect(saveAccountPreferences).toHaveBeenCalledWith(expect.anything(), 'first', preferences)
  })
  it('allows retry when profile loading fails without silently bypassing onboarding', async () => {
    vi.mocked(loadAccountProfile).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ id: 'first', username: 'leonardo', display_name: null, preferences })
    renderGate()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('could not load'))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Workspace for leonardo')).toBeTruthy()
  })
  it('clears the visible workspace after sign-out in another tab', async () => {
    vi.mocked(loadAccountProfile).mockResolvedValue({ id: 'first', username: 'leonardo', display_name: null, preferences })
    renderGate()
    await screen.findByText('Workspace for leonardo')
    act(() => { auth.callback('SIGNED_OUT', null) })
    await waitFor(() => expect(screen.queryByText('Workspace for leonardo')).toBeNull())
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeTruthy()
  })
})
