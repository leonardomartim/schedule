import type { EventSearch } from './event-discovery'
import type { EventSearchLocation, PublicEventPage, PublicEventSource } from './public-event-contract'
import { isDiscoveredEvent } from './event-record-validation'

export async function searchPublicEvents(search: EventSearch, signal?: AbortSignal, page = 1): Promise<PublicEventPage> {
  const params = new URLSearchParams({ city: search.city, q: search.query, radius: String(search.radiusKm), page: String(page) })
  if (search.countryCode) params.set('countryCode', search.countryCode)
  if (search.coordinates) { params.set('latitude', String(search.coordinates.latitude)); params.set('longitude', String(search.coordinates.longitude)) }
  if (search.filters) {
    params.set('category', search.filters.category); params.set('budget', search.filters.budget)
    params.set('from', search.filters.dateFrom); params.set('to', search.filters.dateTo)
  }
  let response: Response
  try { response = await fetch(`/api/public-events?${params}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) }) }
  catch (failure: unknown) { if (signal?.aborted) throw failure; throw new Error('Public events are unavailable right now. Please try again.') }
  if (response.status === 404) throw new Error('Location not found. Try a city and country.')
  if (!response.ok) throw new Error('Public events are unavailable right now. Please try again.')
  let data: unknown
  try { data = await response.json() as unknown } catch { throw new Error('Public events are unavailable right now. Please try again.') }
  if (!data || typeof data !== 'object') throw new Error('Public events are unavailable right now. Please try again.')
  const payload = data as Record<string, unknown>
  if (!Array.isArray(payload.events) || !Array.isArray(payload.sources) || !payload.sources.every(isPublicEventSource) || !isSearchLocation(payload.location) || typeof payload.page !== 'number' || !Number.isInteger(payload.page) || payload.page < 1 || payload.page > 10 || typeof payload.hasMore !== 'boolean') throw new Error('Public events are unavailable right now. Please try again.')
  return { events: payload.events.filter(isDiscoveredEvent).filter((event) => Date.parse(event.startsAt) > Date.now()), sources: payload.sources, location: payload.location, page: payload.page, hasMore: payload.hasMore }
}
function isSearchLocation(value: unknown): value is EventSearchLocation {
  if (!value || typeof value !== 'object') return false
  const location = value as Record<string, unknown>
  return ['city', 'country', 'highlights'].includes(String(location.kind)) && typeof location.label === 'string' &&
    (location.countryCode === undefined || (typeof location.countryCode === 'string' && /^[A-Z]{2}$/.test(location.countryCode))) &&
    (location.kind !== 'city' || typeof location.city === 'string')
}
function isPublicEventSource(value: unknown): value is PublicEventSource {
  if (!value || typeof value !== 'object') return false
  const source = value as Record<string, unknown>
  return ['SP Mais Cultura', 'Sympla', 'Eventbrite'].includes(String(source.name)) && ['ok', 'unavailable'].includes(String(source.status)) && typeof source.count === 'number' && Number.isInteger(source.count) && source.count >= 0 && typeof source.url === 'string' && /^https:\/\//.test(source.url)
}
