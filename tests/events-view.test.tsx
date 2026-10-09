// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventsView } from '../src/events/EventsView'
import { requestDeviceLocation, searchCatalogEvents } from '../src/events/event-service'
import { loadLocalWeather, searchPublicCities } from '../src/events/public-location-service'

vi.mock('../src/events/public-event-service', () => ({ searchPublicEvents: vi.fn().mockResolvedValue({ events: [], sources: [], location: { kind: 'highlights', label: 'International highlights' }, page: 1, hasMore: false }) }))
vi.mock('../src/account/supabase-client', () => ({ supabase: {} }))
vi.mock('../src/events/event-service', () => ({ searchCatalogEvents: vi.fn(), requestDeviceLocation: vi.fn() }))
vi.mock('../src/events/public-location-service', () => ({ searchPublicCities: vi.fn(), loadLocalWeather: vi.fn() }))
beforeEach(() => { vi.mocked(searchPublicCities).mockResolvedValue([]); vi.mocked(loadLocalWeather).mockResolvedValue({ temperature: 23, description: 'Cloudy' }) })
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks() })
const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const

describe('event search interface', () => {
  it('refreshes the catalog when clearing a previously submitted strict filter', async () => {
    const event = { id: 'music', title: 'Concert after clearing', description: '', category: 'music', startsAt: '2027-01-05T18:00:00Z', venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null } as const
    vi.mocked(searchCatalogEvents).mockResolvedValueOnce([]).mockResolvedValueOnce([event])
    const user = userEvent.setup()
    render(<EventsView preferences={preferences} />)
    await user.type(screen.getByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByText('More filters'))
    await user.selectOptions(screen.getByLabelText('Category'), 'sports')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await screen.findByText('No upcoming events found.')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('heading', { name: 'Concert after clearing' })).toBeTruthy()
    expect(searchCatalogEvents).toHaveBeenLastCalledWith({}, expect.objectContaining({ filters: expect.objectContaining({ category: 'all' }) }), preferences)
  })
  it('returns to the last search after browsing saved events', async () => {
    vi.mocked(searchCatalogEvents).mockResolvedValue([{ id: 'last-search', title: 'Last search concert', description: '', category: 'music', startsAt: '2027-01-05T18:00:00Z', venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null }])
    const user = userEvent.setup()
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    await user.type(screen.getByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await screen.findByRole('heading', { name: 'Last search concert' })
    await user.click(screen.getByRole('button', { name: /Saved events/ }))
    await user.click(screen.getByRole('button', { name: 'Upcoming events' }))
    expect(screen.getByRole('heading', { name: 'Last search concert' })).toBeTruthy()
    expect(searchCatalogEvents).toHaveBeenCalledTimes(1)
  })
  it('sends strict filters and allows clearing them', async () => {
    vi.mocked(searchCatalogEvents).mockResolvedValue([])
    const user = userEvent.setup()
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    await user.type(screen.getByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByText('More filters'))
    await user.selectOptions(screen.getByLabelText('Category'), 'sports')
    await user.selectOptions(screen.getByLabelText('Price'), 'free')
    await user.selectOptions(screen.getByLabelText('Sort by'), 'soonest')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    expect(searchCatalogEvents).toHaveBeenCalledWith({}, expect.objectContaining({ filters: expect.objectContaining({ category: 'sports', budget: 'free', sort: 'soonest' }) }), preferences)
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByLabelText('Category')).toHaveProperty('value', 'all')
    expect(screen.getByLabelText('Price')).toHaveProperty('value', 'any')
  })
  it('selects a public city and keeps catalog search working when weather fails', async () => {
    vi.mocked(searchPublicCities).mockResolvedValue([{ id: 1, label: 'São Paulo, Brazil', latitude: -23.55, longitude: -46.63 }])
    vi.mocked(searchCatalogEvents).mockResolvedValue([])
    vi.mocked(loadLocalWeather).mockRejectedValue(new Error('Weather is unavailable right now.'))
    const user = userEvent.setup()
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    await user.type(screen.getByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Find city on map' }))
    await user.click(await screen.findByRole('button', { name: 'São Paulo, Brazil' }))
    expect(await screen.findByRole('link', { name: 'View search area on OpenStreetMap' })).toHaveProperty('href', expect.stringContaining('mlat=-23.55'))
    expect(await screen.findByText('Weather is unavailable right now.')).toBeTruthy()
    expect(searchCatalogEvents).toHaveBeenCalledWith({}, expect.objectContaining({ coordinates: { latitude: -23.55, longitude: -46.63 } }), preferences)
  })
  it('saves full event details per account and adds an event to the agenda', async () => {
    const event = { id: 'saved', title: 'Saved concert', description: '', category: 'music', startsAt: '2027-01-05T18:00:00Z', venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null } as const
    vi.mocked(searchCatalogEvents).mockResolvedValue([event])
    const onAddToAgenda = vi.fn()
    const user = userEvent.setup()
    const view = render(<EventsView userId="first" preferences={preferences} onEditPreferences={vi.fn()} onAddToAgenda={onAddToAgenda} agendaEventIds={[]} />)
    await user.type(screen.getByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await user.click(await screen.findByRole('button', { name: 'Save Saved concert' }))
    await user.click(screen.getByRole('button', { name: 'Add Saved concert to agenda' }))
    expect(onAddToAgenda).toHaveBeenCalledWith(event)
    view.unmount()
    render(<EventsView userId="first" preferences={preferences} onEditPreferences={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Saved events/ }))
    expect(screen.getByRole('heading', { name: 'Saved concert' })).toBeTruthy()
    expect(requestDeviceLocation).not.toHaveBeenCalled()
  })
  it('never requests location on mount and supports a city after permission denial', async () => {
    vi.mocked(requestDeviceLocation).mockRejectedValue(new Error('Location access was denied. Enter a city to search.'))
    vi.mocked(searchCatalogEvents).mockResolvedValue([])
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    expect(requestDeviceLocation).not.toHaveBeenCalled()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('denied'))
    await user.type(screen.getByLabelText('City or country'), 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    expect(searchCatalogEvents).toHaveBeenCalledWith({}, expect.objectContaining({ city: 'São Paulo', radiusKm: 25 }), preferences)
    expect(await screen.findByText('No upcoming events found.')).toBeTruthy()
  })
  it('ignores an old response when the location changes', async () => {
    let resolveSearch: (events: []) => void = () => undefined
    vi.mocked(searchCatalogEvents).mockReturnValue(new Promise((resolve) => { resolveSearch = resolve }))
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('City or country'), 'London')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await user.clear(screen.getByLabelText('City or country'))
    await user.type(screen.getByLabelText('City or country'), 'Paris')
    resolveSearch([])
    await waitFor(() => expect(screen.queryByText('No upcoming events found.')).toBeNull())
  })
  it('searches a granted location and displays a real catalog result with a safe details link', async () => {
    vi.mocked(requestDeviceLocation).mockResolvedValue({ latitude: -23.55, longitude: -46.63 })
    vi.mocked(searchCatalogEvents).mockResolvedValue([{
      id: 'event-1', title: 'Neighborhood concert', description: 'An outdoor performance', category: 'music',
      startsAt: '2027-01-05T18:00:00Z', venue: 'Town Hall', city: 'São Paulo', latitude: -23.55, longitude: -46.63,
      price: 0, currency: 'BRL', url: 'https://example.com/concert', distanceKm: 1.5,
    }])
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByRole('heading', { name: 'Neighborhood concert' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Event details' }).getAttribute('href')).toBe('https://example.com/concert')
    expect(screen.getByText('Free', { exact: true })).toBeTruthy()
    expect(searchCatalogEvents).toHaveBeenCalledWith({}, expect.objectContaining({ coordinates: { latitude: -23.55, longitude: -46.63 } }), preferences)
  })
})
