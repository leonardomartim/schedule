// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import type { SignedInAccount } from '../src/account/AccountGate'
import { localDateKey } from '../src/event-agenda'
import { searchCatalogEvents } from '../src/events/event-service'

vi.mock('../src/account/AccountGate', () => ({ AccountGate: ({ children }: { children: (account: SignedInAccount) => ReactNode }) => children({ userId: 'workspace-user', displayName: 'Leo', preferences: { interests: ['music'], radiusKm: 25, budget: 'any' }, onSignOut: vi.fn(), onEditPreferences: vi.fn() }) }))
vi.mock('../src/events/public-event-service', () => ({ searchPublicEvents: vi.fn().mockResolvedValue({ events: [], sources: [], location: { kind: 'highlights', label: 'International highlights' }, page: 1, hasMore: false }) }))
vi.mock('../src/account/supabase-client', () => ({ supabase: {} }))
vi.mock('../src/events/event-service', () => ({ searchCatalogEvents: vi.fn(), requestDeviceLocation: vi.fn() }))

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks() })

describe('post-login workspace', () => {
  it('translates account navigation and keeps an unfinished agenda draft across language changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /^Today/ }))
    await user.click(screen.getByRole('button', { name: 'Add to day' }))
    await user.type(screen.getByLabelText('What needs your attention?'), 'Meu plano')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR')
    expect(screen.getByLabelText('O que precisa da sua atenção?')).toHaveProperty('value', 'Meu plano')
    expect(screen.getByRole('button', { name: /^Explorar/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Adicionar à agenda' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: /^Lixeira/ }))
    expect(screen.getByText('As notas ficam aqui até você restaurá-las.')).toBeTruthy()
  })
  it('keeps the composer open instead of adding a commitment with no time', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /^Today/ }))
    await user.click(screen.getByRole('button', { name: 'Add to day' }))
    await user.type(screen.getByLabelText('What needs your attention?'), 'Invalid task')
    await user.clear(screen.getByLabelText('Time'))
    await user.click(screen.getByRole('button', { name: 'Add to agenda', exact: true }))
    expect(screen.queryByRole('heading', { name: 'Invalid task' })).toBeNull()
    expect(screen.getByLabelText('What needs your attention?')).toHaveProperty('value', 'Invalid task')
  })
  it('keeps the workspace usable and warns when local persistence fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('only for this session'))
    vi.restoreAllMocks()
  })
  it('adds a discovered event on the correct day, prevents duplicates and supports removal', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(18, 30, 0, 0)
    vi.mocked(searchCatalogEvents).mockResolvedValue([{ id: 'concert', title: 'Tomorrow concert', description: '', category: 'music', startsAt: tomorrow.toISOString(), venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null }])
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await user.click(await screen.findByRole('button', { name: 'Add Tomorrow concert to agenda' }))
    expect(screen.getByRole('button', { name: 'Added Tomorrow concert to agenda' })).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: /^Today/ }))
    expect(screen.queryByRole('heading', { name: 'Tomorrow concert' })).toBeNull()
    await user.click(screen.getByRole('button', { name: `Choose ${localDateKey(tomorrow)}` }))
    expect(screen.getAllByRole('heading', { name: 'Tomorrow concert' }).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Remove Tomorrow concert from agenda' }))
    expect(screen.queryByRole('heading', { name: 'Tomorrow concert' })).toBeNull()
  })
  it('navigates dates, creates commitments for the selected day and resets to today', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Today/ }))
    await user.click(screen.getByRole('button', { name: 'Next days' }))
    await user.click(screen.getByRole('button', { name: 'Add to day' }))
    await user.type(screen.getByLabelText('What needs your attention?'), 'Future task')
    await user.click(screen.getByRole('button', { name: 'Add to agenda', exact: true }))
    expect(screen.getAllByRole('heading', { name: 'Future task' }).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Go to today' }))
    expect(screen.queryByRole('heading', { name: 'Future task' })).toBeNull()
    const stored = JSON.parse(localStorage.getItem('schedule.items.v1.workspace-user') ?? '[]') as { date: string }[]
    expect(stored[0].date).not.toBe(localDateKey(new Date()))
  })
  it('opens existing notes without creating an unwanted note', async () => {
    localStorage.setItem('schedule.notes.v1.workspace-user', JSON.stringify([{ id: 1, title: 'Existing thought', preview: 'Remember this', updated: 'now', accent: 'cream' }]))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Today/ }))
    await user.click(screen.getByRole('button', { name: 'Open notes' }))
    expect(screen.getByRole('button', { name: /Existing thought/ })).toBeTruthy()
    expect(screen.queryByText('Untitled note')).toBeNull()
  })
})
