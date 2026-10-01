// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthScreen } from '../src/account/AuthScreen'
import { PreferenceQuestions } from '../src/account/PreferenceQuestions'

afterEach(cleanup)

describe('account forms', () => {
  it('shows a Google availability error in the form and keeps password sign-in available', async () => {
    const onGoogle = vi.fn().mockRejectedValue(new Error('Google sign-in is not enabled for this site yet.'))
    render(<AuthScreen configured onSignIn={vi.fn()} onRegister={vi.fn()} onGoogle={onGoogle} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Google sign-in is not enabled for this site yet.')
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toHaveProperty('disabled', false)
  })
  it('submits credentials and shows server errors without leaving the sign-in form', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    render(<AuthScreen configured onSignIn={signIn} onRegister={vi.fn()} onGoogle={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Username or email'), 'leo')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
    expect(signIn).toHaveBeenCalledWith('leo', 'wrong-password')
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Invalid login credentials')
  })
  it('shows confirmation instructions when signup requires email verification', async () => {
    const register = vi.fn().mockResolvedValue(false)
    render(<AuthScreen configured onSignIn={vi.fn()} onRegister={register} onGoogle={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Username'), 'leonardo')
    await user.type(screen.getByLabelText('Email'), 'leo@example.com')
    await user.type(screen.getByLabelText('Password'), 'a-long-password')
    await user.click(screen.getByRole('button', { name: 'Create account', exact: true }))
    expect(register).toHaveBeenCalledWith({ username: 'leonardo', email: 'leo@example.com', password: 'a-long-password' })
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Check your email'))
  })
  it('collects exactly three answers, preserves them on save failure, and permits retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Unable to save')).mockResolvedValue(undefined)
    render(<PreferenceQuestions onSave={save} onSignOut={vi.fn()} />)
    const user = userEvent.setup()
    expect(screen.getAllByRole('group')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Find my events' }))
    expect(save).not.toHaveBeenCalled()
    await user.click(screen.getByLabelText('Music'))
    await user.selectOptions(screen.getByLabelText('Travel distance'), '25')
    await user.click(screen.getByLabelText('Free events'))
    await user.click(screen.getByRole('button', { name: 'Find my events' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Unable to save')
    await user.click(screen.getByRole('button', { name: 'Find my events' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save).toHaveBeenLastCalledWith({ interests: ['music'], radiusKm: 25, budget: 'free' })
  })
})
