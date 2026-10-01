import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchCatalogEvents, requestDeviceLocation } from '../src/events/event-service'
import { safeEventUrl } from '../src/events/event-discovery'

afterEach(() => vi.unstubAllGlobals())

describe('event catalog requests', () => {
  it('sends coordinates, radius and preferences to the database without requiring a city', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const preferences = { interests: ['arts'], radiusKm: 10, budget: 'any' } as const
    await searchCatalogEvents({ rpc }, { city: 'ignored', coordinates: { latitude: 0, longitude: 0 }, query: ' jazz ', radiusKm: 10 }, preferences)
    expect(rpc).toHaveBeenCalledWith('search_upcoming_events', {
      p_latitude: 0, p_longitude: 0, p_city: null, p_radius_km: 10, p_query: 'jazz', p_interests: ['arts'], p_budget: 'any',
    })
  })
  it('supports city fallback and distinguishes a failed search from an empty catalog', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const search = { city: ' São Paulo ', query: '', radiusKm: 25 }
    const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const
    await expect(searchCatalogEvents({ rpc }, search, preferences)).resolves.toEqual([])
    expect(rpc.mock.calls[0][1].p_city).toBe('São Paulo')
    rpc.mockResolvedValue({ data: null, error: { message: 'missing relation' } })
    await expect(searchCatalogEvents({ rpc }, search, preferences)).rejects.toThrow('unavailable')
  })
  it('gives an actionable fallback when location permission is denied', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) => failure({ code: 1 }) } })
    await expect(requestDeviceLocation()).rejects.toThrow('Enter a city')
  })
  it('rejects executable event links', () => {
    expect(safeEventUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeEventUrl('https://example.com/event')).toBe('https://example.com/event')
  })
})
