// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventsView } from '../src/events/EventsView'
import { searchPublicEvents } from '../src/events/public-event-service'
import type { PublicEventPage } from '../src/events/public-event-contract'

vi.mock('../src/events/public-event-service', () => ({ searchPublicEvents: vi.fn() }))
vi.mock('../src/account/supabase-client', () => ({ supabase: null }))
vi.mock('../src/events/public-location-service', () => ({ searchPublicCities: vi.fn().mockResolvedValue([]), loadLocalWeather: vi.fn() }))
const preferences = { interests: [], radiusKm: 25, budget: 'any' } as const
function results(city: string, id = city, hasMore = false): PublicEventPage {
  return { events: [{ id, title: `${city} event`, description: '', category: 'music', city, latitude: null, longitude: null, startsAt: '2027-01-05T18:00:00Z', venue: 'Hall', price: null, currency: 'BRL', url: 'https://www.sympla.com.br/evento/concert/1', source: 'Sympla' }], location: { kind: 'city', label: city, city }, page: 1, sources: [], hasMore }
}
beforeEach(() => vi.mocked(searchPublicEvents).mockResolvedValue(results('São Paulo')))
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks() })
describe('search beyond São Paulo', () => {
  it('fetches Curitiba on submit and replaces the old city results before login', async () => {
    render(<EventsView publicMode preferences={preferences} />)
    await screen.findByRole('heading', { name: 'São Paulo event' })
    vi.mocked(searchPublicEvents).mockResolvedValue(results('Curitiba'))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('City or country'), 'Curitiba')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    expect(await screen.findByRole('heading', { name: 'Curitiba event' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'São Paulo event' })).toBeNull()
    expect(searchPublicEvents).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Curitiba' }), expect.any(AbortSignal), 1)
  })
  it('searches a country across its cities and loads more without duplicating cards', async () => {
    render(<EventsView publicMode preferences={preferences} />)
    await screen.findByRole('heading', { name: 'São Paulo event' })
    const japan = { ...results('Tokyo', 'tokyo', true), location: { kind: 'country' as const, label: 'Japan', countryCode: 'JP' } }
    vi.mocked(searchPublicEvents).mockResolvedValueOnce(japan).mockResolvedValueOnce({ ...japan, page: 2, hasMore: false, events: [...japan.events, ...results('Osaka').events] })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('City or country'), 'Japão')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await screen.findByRole('heading', { name: 'Tokyo event' })
    expect(screen.getByText('Results for Japan')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Load more events' }))
    expect(await screen.findByRole('heading', { name: 'Osaka event' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: 'Tokyo event' })).toHaveLength(1)
    expect(searchPublicEvents).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Japão' }), expect.any(AbortSignal), 2)
  })
  it('discards an earlier region response after the user changes location', async () => {
    render(<EventsView publicMode preferences={preferences} />)
    await screen.findByRole('heading', { name: 'São Paulo event' })
    let finishJapan: (page: PublicEventPage) => void = () => undefined
    vi.mocked(searchPublicEvents).mockImplementationOnce(() => new Promise((resolve) => { finishJapan = resolve })).mockResolvedValue(results('Curitiba'))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('City or country'), 'Japão')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await user.clear(screen.getByLabelText('City or country'))
    await user.type(screen.getByLabelText('City or country'), 'Curitiba')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await screen.findByRole('heading', { name: 'Curitiba event' })
    await act(async () => finishJapan(results('Tokyo')))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Tokyo event' })).toBeNull())
  })
})
