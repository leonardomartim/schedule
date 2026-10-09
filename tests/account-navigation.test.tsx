// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountWorkspace } from '../src/workspace/AccountWorkspace'
import type { SignedInAccount } from '../src/account/AccountGate'

vi.mock('../src/events/EventsView', () => ({ EventsView: () => <section style={{ minHeight: 3000 }}><h1>Long event list</h1></section> }))
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })
function testAccount(): SignedInAccount {
  return { userId: 'navigation-test', displayName: 'Leo', preferences: { interests: ['music'], radiusKm: 25, budget: 'any' }, onEditPreferences: vi.fn(), onSignOut: vi.fn().mockResolvedValue(undefined) }
}
describe('persistent account navigation', () => {
  it('opens preferences from the profile in every workspace view', async () => {
    const account = testAccount()
    const user = userEvent.setup()
    render(<AccountWorkspace account={account} />)
    await screen.findByRole('heading', { name: 'Long event list' })
    for (const view of ['Explore', 'Today', 'Notes', 'Trash']) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${view}`) }))
      const profile = screen.getByRole('button', { name: 'Open account menu' })
      await user.click(profile)
      expect(profile.getAttribute('aria-expanded')).toBe('true')
      const actions = screen.getByRole('region', { name: 'Account actions' })
      expect(within(actions).getByText('Leo')).toBeTruthy()
      await user.click(within(actions).getByRole('button', { name: 'Preferences' }))
      expect(screen.queryByRole('region', { name: 'Account actions' })).toBeNull()
    }
    expect(account.onEditPreferences).toHaveBeenCalledTimes(4)
  })
  it('closes the profile with Escape or outside interaction and restores keyboard focus', async () => {
    const user = userEvent.setup()
    render(<AccountWorkspace account={testAccount()} />)
    const profile = screen.getByRole('button', { name: 'Open account menu' })
    await user.click(profile)
    await user.tab()
    await user.keyboard('{Escape}')
    expect(profile.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(profile)
    await user.click(profile)
    await user.click(await screen.findByRole('heading', { name: 'Long event list' }))
    expect(screen.queryByRole('region', { name: 'Account actions' })).toBeNull()
  })
  it('shares pending logout and failure feedback across profile and sidebar and permits retry', async () => {
    let rejectSignOut: (failure: Error) => void = () => undefined
    const account = testAccount()
    vi.mocked(account.onSignOut).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSignOut = reject }))
    const user = userEvent.setup()
    render(<AccountWorkspace account={account} />)
    await user.click(screen.getByRole('button', { name: 'Open account menu' }))
    await user.click(within(screen.getByRole('region', { name: 'Account actions' })).getByRole('button', { name: 'Sign out' }))
    expect(account.onSignOut).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button', { name: 'Signing out…' })).toHaveLength(2)
    for (const button of screen.getAllByRole('button', { name: 'Signing out…' })) expect(button).toHaveProperty('disabled', true)
    rejectSignOut(new Error('Unable to sign out. Please try again.'))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Unable to sign out. Please try again.')
    await user.click(within(screen.getByRole('region', { name: 'Account actions' })).getByRole('button', { name: 'Sign out' }))
    expect(account.onSignOut).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('closes navigation after creating a note and closes the profile when switching views', async () => {
    const user = userEvent.setup()
    render(<AccountWorkspace account={testAccount()} />)
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(screen.getByRole('complementary').getAttribute('data-open')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'New note' }))
    expect(screen.getByRole('complementary').getAttribute('data-open')).toBe('false')
    expect(screen.getByLabelText('Note title')).toHaveProperty('value', 'Untitled note')
    await user.click(screen.getByRole('button', { name: 'Open account menu' }))
    await user.click(screen.getByRole('button', { name: /^Today/ }))
    expect(screen.queryByRole('region', { name: 'Account actions' })).toBeNull()
  })
})
