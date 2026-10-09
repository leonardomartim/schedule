import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveEventLocation } from '../server/event-location-resolver'
import { parseEventbriteEvents } from '../server/eventbrite-event-parser'
import { parseSymplaEvents } from '../server/sympla-event-parser'
import { GET } from '../api/public-events'

const japaneseEvent = { id: 'jp-1', name: 'Tokyo music night', summary: 'Live music', start_date: '2027-01-05', start_time: '18:30', timezone: 'Asia/Tokyo', url: 'https://www.eventbrite.com/e/tokyo-tickets-123', tags: [{ display_name: 'Music' }], primary_venue: { name: 'Hall', address: { city: 'Tokyo', country: 'JP', latitude: '35.68', longitude: '139.69' } } }
function eventbriteHtml(records: unknown[], pageCount = 1): string {
  return `<script>window.__SERVER_DATA__ = ${JSON.stringify({ search_data: { events: { results: records, pagination: { page_count: pageCount } } } })};</script>`
}
const brazilianEvent = { id: 12, name: 'Show em Curitiba', start_date: '2027-01-05T21:00:00Z', url: 'https://www.sympla.com.br/evento/show/12', location: { name: 'Teatro', city: 'Curitiba', state: 'PR', country: 'BRASIL', lat: -25.43, lon: -49.27 } }
function symplaHtml(records: unknown[]): string {
  return `<script>self.__next_f.push([1,${JSON.stringify(`1:${JSON.stringify({ components: [{ response: { data: records } }] })}\n`)}])</script>`
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('international public event discovery', () => {
  it('uses the requested GPS area, excludes distant or unlocated events and never caches coordinates publicly', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('photon.komoot.io')) return Response.json({ features: [{ properties: { city: 'Curitiba', countrycode: 'br', state: 'Paraná' } }] })
      if (url.includes('sympla.com.br')) return new Response(symplaHtml([brazilianEvent, { ...brazilianEvent, id: 13, name: 'Far away', location: { ...brazilianEvent.location, lat: -23.55, lon: -46.63 } }, { ...brazilianEvent, id: 14, name: 'Unknown venue', location: { city: 'Curitiba', state: 'PR' } }]))
      return new Response(eventbriteHtml([japaneseEvent]))
    })
    vi.stubGlobal('fetch', fetchMock)
    const response = await GET(new Request('https://schedule.example/api/public-events?latitude=-25.43&longitude=-49.27&radius=25'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    const payload = await response.json()
    expect(payload.location).toMatchObject({ city: 'Curitiba', countryCode: 'BR' })
    expect(payload.events).toHaveLength(1)
    expect(payload.events[0]).toMatchObject({ title: 'Show em Curitiba', distanceKm: 0 })
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('sao-paulo'))).toBe(false)
  })
  it('distinguishes a genuinely empty agenda from outages and uses CDN caching only for valid results', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(async () => new Response(eventbriteHtml([]))).mockRejectedValueOnce(new Error('Offline'))
    vi.stubGlobal('fetch', fetchMock); vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const request = new Request('https://schedule.example/api/public-events?city=Japan')
    const empty = await GET(request)
    expect(empty.status).toBe(200)
    expect(empty.headers.get('Cache-Control')).toContain('s-maxage=1800')
    expect((await empty.json()).events).toEqual([])
    const outage = await GET(request)
    expect(outage.status).toBe(502)
    expect(outage.headers.get('Cache-Control')).toBe('no-store')
  })
  it('recognizes countries in Portuguese and English without treating them as city names', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect(await resolveEventLocation({ city: 'Japão', query: '', radiusKm: 25 })).toMatchObject({ kind: 'country', countryCode: 'JP', countryName: 'Japan' })
    expect(await resolveEventLocation({ city: 'United Kingdom', query: '', radiusKm: 25 })).toMatchObject({ kind: 'country', countryCode: 'GB' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('resolves Curitiba with its country and region and rejects unknown places', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ results: [{ name: 'Curitiba', admin1: 'Paraná', country: 'Brazil', country_code: 'BR', latitude: -25.43, longitude: -49.27 }] })).mockResolvedValueOnce(Response.json({})))
    expect(await resolveEventLocation({ city: 'Curitiba', query: '', radiusKm: 25 })).toMatchObject({ kind: 'city', city: 'Curitiba', countryCode: 'BR', region: 'Paraná' })
    await expect(resolveEventLocation({ city: 'Unknown place', query: '', radiusKm: 25 })).rejects.toThrow('Location not found')
  })
  it('converts venue timezones correctly, validates source URLs and omits expired, online and cancelled listings', () => {
    const parsed = parseEventbriteEvents(eventbriteHtml([japaneseEvent, japaneseEvent, { ...japaneseEvent, id: 'expired', start_date: '2020-01-01' }, { ...japaneseEvent, id: 'online', is_online_event: true }, { ...japaneseEvent, id: 'cancelled', is_cancelled: true }, { ...japaneseEvent, id: 'unsafe', url: 'javascript:alert(1)' }]), new Date('2026-10-09'))
    expect(parsed.events).toHaveLength(1)
    expect(parsed.events[0]).toMatchObject({ startsAt: '2027-01-05T09:30:00.000Z', city: 'Tokyo', countryCode: 'JP', timeZone: 'Asia/Tokyo', source: 'Eventbrite', price: null })
    expect(() => parseEventbriteEvents('<script>throw Error("changed")</script>')).toThrow(/format/i)
  })
  it('reads real Sympla records without evaluating scripts or inventing prices', () => {
    const events = parseSymplaEvents(symplaHtml([brazilianEvent, brazilianEvent, { ...brazilianEvent, id: 14, start_date: 'invalid' }]), new Date('2026-10-09'))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ city: 'Curitiba', countryCode: 'BR', source: 'Sympla', price: null, latitude: -25.43 })
  })
  it('queries a whole country and exposes pagination instead of filtering a São Paulo snapshot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(eventbriteHtml([japaneseEvent], 3)))
    vi.stubGlobal('fetch', fetchMock)
    const response = await GET(new Request('https://schedule.example/api/public-events?city=Jap%C3%A3o&page=2'))
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ location: { kind: 'country', countryCode: 'JP' }, page: 2, hasMore: true })
    expect(payload.events[0].city).toBe('Tokyo')
    const upstream = new URL(fetchMock.mock.calls[0][0])
    expect(upstream.pathname).toBe('/d/japan/all-events/')
    expect(upstream.searchParams.get('page')).toBe('2')
  })
  it('keeps Curitiba results when one provider fails and reports the partial failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('geocoding-api')) return Response.json({ results: [{ name: 'Curitiba', country: 'Brazil', country_code: 'BR', admin1: 'Paraná', latitude: -25.43, longitude: -49.27 }] })
      if (url.includes('sympla.com.br')) return new Response(symplaHtml([brazilianEvent]))
      throw new Error('Source offline')
    }))
    const response = await GET(new Request('https://schedule.example/api/public-events?city=Curitiba'))
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.events).toHaveLength(1)
    expect(payload.events[0].city).toBe('Curitiba')
    expect(payload.sources).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Eventbrite', status: 'unavailable' }), expect.objectContaining({ name: 'Sympla', status: 'ok' })]))
  })
  it('rejects invalid coordinates, huge input and arbitrary upstream URLs before contacting providers', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    for (const query of ['latitude=95&longitude=0', 'city=' + 'a'.repeat(121), 'city=https%3A%2F%2Flocalhost%2F', 'page=0']) {
      expect((await GET(new Request('https://schedule.example/api/public-events?' + query))).status).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
