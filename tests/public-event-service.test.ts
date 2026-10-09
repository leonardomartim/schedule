import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchPublicEvents } from '../src/events/public-event-service'
import { publicEventPage } from './fixtures/public-event-page'

afterEach(() => vi.unstubAllGlobals())
describe('public event API client', () => {
  it('sends location, keyword and pagination to the server instead of filtering a snapshot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(publicEventPage()))
    vi.stubGlobal('fetch', fetchMock)
    await searchPublicEvents({ city: 'Japão', query: 'music & art', radiusKm: 50 }, undefined, 2)
    const url = new URL(fetchMock.mock.calls[0][0], 'https://schedule.example')
    expect(url.searchParams.get('city')).toBe('Japão')
    expect(url.searchParams.get('q')).toBe('music & art')
    expect(url.searchParams.get('page')).toBe('2')
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
  it('rejects malformed source metadata and reports network outages with a useful message', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ...publicEventPage(), sources: [null] })).mockRejectedValueOnce(new Error('ECONNRESET'))
    vi.stubGlobal('fetch', fetchMock)
    const search = { city: 'Curitiba', query: '', radiusKm: 25 }
    await expect(searchPublicEvents(search)).rejects.toThrow('Public events are unavailable')
    await expect(searchPublicEvents(search)).rejects.toThrow('Public events are unavailable')
  })
})
