// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublicLanding } from '../src/events/PublicLanding'
import { searchPublicEvents } from '../src/events/public-event-service'
import { publicEventPage } from './fixtures/public-event-page'
import type { PublicEventPage } from '../src/events/public-event-contract'
import { requestDeviceLocation } from '../src/events/event-service'
import { PresentationProvider } from '../src/presentation/PresentationProvider'
import { StrictMode } from 'react'
vi.mock('../src/account/supabase-client', () => ({ supabase: {} }))
vi.mock('../src/events/event-service', () => ({ searchCatalogEvents: vi.fn(), requestDeviceLocation: vi.fn() }))
vi.mock('../src/events/public-event-service', () => ({ searchPublicEvents: vi.fn() }))
const featured = { id: 'sp-culture:concert', title: 'Concerto público', description: 'Música ao vivo', category: 'music', startsAt: '2027-01-05T21:00:00Z', venue: 'Centro Cultural · Rua Vergueiro, 1000', city: 'São Paulo', latitude: null, longitude: null, price: null, currency: 'BRL', url: 'https://spmaiscultura.prefeitura.sp.gov.br/todos-eventos', source: 'SP Mais Cultura' } as const
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
beforeEach(() => { vi.mocked(searchPublicEvents).mockResolvedValue(publicEventPage([featured])) })
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal') })
describe('public event homepage', () => {
  it('still displays the initial feed when a visitor types before loading finishes', async () => {
    let finishLoading: (events: PublicEventPage) => void = () => undefined
    vi.mocked(searchPublicEvents).mockReturnValueOnce(new Promise((resolve) => { finishLoading = resolve }))
    render(<PublicLanding authScreen={null} />)
    await userEvent.setup().type(screen.getByLabelText('Event or keyword'), 'concerto')
    await act(async () => finishLoading(publicEventPage([featured])))
    expect(await screen.findByRole('heading', { name: 'Concerto público' })).toBeTruthy()
  })
  it('keeps Portuguese category keywords working when submitting the search', async () => {
    const user = userEvent.setup()
    vi.mocked(searchPublicEvents).mockResolvedValue(publicEventPage([{ ...featured, category: 'arts', title: 'Exposição pública', description: '' }]))
    render(<PresentationProvider><PublicLanding authScreen={null} /></PresentationProvider>)
    await screen.findByRole('heading', { name: 'Exposição pública' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR')
    await user.type(screen.getByLabelText('Evento ou palavra-chave'), 'Artes')
    await user.click(screen.getByRole('button', { name: 'Buscar eventos' }))
    expect(await screen.findByRole('heading', { name: 'Exposição pública' })).toBeTruthy()
  })
  it('loads real events before sign-in, avoids automatic GPS and opens authentication only on a personal action', async () => {
    // jsdom has no native modal autofocus; model it to catch StrictMode effect replay.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement): void { this.setAttribute('open', ''); this.querySelector('button')?.focus() } })
    render(<StrictMode><PresentationProvider><PublicLanding authScreen={<h2>Welcome back.</h2>} /></PresentationProvider></StrictMode>)
    expect(await screen.findByRole('heading', { name: 'Concerto público' })).toBeTruthy()
    expect(requestDeviceLocation).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save Concerto público' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Close sign-in' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Concerto público' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save Concerto público' }))
  })
  it('filters the public feed and retains the field values when changing language or theme', async () => {
    const user = userEvent.setup()
    render(<PresentationProvider><PublicLanding authScreen={<h2>Welcome back.</h2>} /></PresentationProvider>)
    await screen.findByRole('heading', { name: 'Concerto público' })
    await user.type(screen.getByLabelText('Event or keyword'), 'concerto')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR')
    expect(screen.getByLabelText('Evento ou palavra-chave')).toHaveProperty('value', 'concerto')
    await user.click(screen.getByRole('button', { name: 'Ativar tema claro' }))
    expect(screen.getByRole('heading', { name: 'Concerto público' })).toBeTruthy()
    expect(screen.getByText('Preço não informado')).toBeTruthy()
  })
  it('allows retry when the official source is unavailable', async () => {
    vi.mocked(searchPublicEvents).mockRejectedValueOnce(new Error('Public events are unavailable right now. Please try again.')).mockResolvedValue(publicEventPage([featured]))
    render(<PublicLanding authScreen={null} />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Concerto público' })).toBeTruthy()
  })
})
