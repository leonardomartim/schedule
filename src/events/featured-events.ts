import { distanceInKm, type DiscoveredEvent, type EventSearch } from './event-discovery'
import { isDiscoveredEvent } from './event-record-validation'

export async function loadFeaturedEvents(signal?: AbortSignal): Promise<DiscoveredEvent[]> {
  const response = await fetch('/api/public-events', { signal })
  if (!response.ok) throw new Error('Public events are unavailable right now. Please try again.')
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || !('events' in payload) || !Array.isArray(payload.events)) throw new Error('Public events are unavailable right now. Please try again.')
  return payload.events.filter(isDiscoveredEvent).filter((event) => Date.parse(event.startsAt) > Date.now())
}
function normalizeSearchText(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() }
export function filterFeaturedEvents(events: DiscoveredEvent[], search: EventSearch): DiscoveredEvent[] {
  const city = normalizeSearchText(search.city.split(',')[0])
  const query = normalizeSearchText(search.query)
  return events.flatMap((event): DiscoveredEvent[] => {
    if (city && normalizeSearchText(event.city) !== city) return []
    if (query && !normalizeSearchText(`${event.title} ${event.description} ${event.venue} ${event.category}`).includes(query)) return []
    if (!search.coordinates) return [event]
    if (event.latitude === null || event.longitude === null) return []
    const distanceKm = distanceInKm(search.coordinates, { latitude: event.latitude, longitude: event.longitude })
    return distanceKm <= search.radiusKm ? [{ ...event, distanceKm }] : []
  })
}
const cityStorageKey = 'schedule.search-city.v1'
export function loadSearchCity(): string {
  try { const value = localStorage.getItem(cityStorageKey) ?? ''; return value.length <= 120 ? value : '' } catch { return '' }
}
export function rememberSearchCity(city: string): void {
  try { if (city.trim()) localStorage.setItem(cityStorageKey, city.trim()); else localStorage.removeItem(cityStorageKey) } catch { /* Manual city entry remains available. */ }
}
