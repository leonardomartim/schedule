// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventsView } from '../src/events/EventsView'
import { requestDeviceLocation, searchCatalogEvents } from '../src/events/event-service'

vi.mock('../src/account/supabase-client', () => ({ supabase: {} }))
vi.mock('../src/events/event-service', () => ({ searchCatalogEvents: vi.fn(), requestDeviceLocation: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const

describe('event search interface', () => {
  it('never requests location on mount and supports a city after permission denial', async () => {
    vi.mocked(requestDeviceLocation).mockRejectedValue(new Error('Location access was denied. Enter a city to search.'))
    vi.mocked(searchCatalogEvents).mockResolvedValue([])
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    expect(requestDeviceLocation).not.toHaveBeenCalled()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('denied'))
    await user.type(screen.getByLabelText('City'), 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    expect(searchCatalogEvents).toHaveBeenCalledWith({}, expect.objectContaining({ city: 'São Paulo', radiusKm: 25 }), preferences)
    expect(await screen.findByText('No upcoming events found.')).toBeTruthy()
  })
  it('ignores an old response when the location changes', async () => {
    let resolveSearch: (events: []) => void = () => undefined
    vi.mocked(searchCatalogEvents).mockReturnValue(new Promise((resolve) => { resolveSearch = resolve }))
    render(<EventsView preferences={preferences} onEditPreferences={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('City'), 'London')
    await user.click(screen.getByRole('button', { name: 'Find events' }))
    await user.clear(screen.getByLabelText('City'))
    await user.type(screen.getByLabelText('City'), 'Paris')
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
