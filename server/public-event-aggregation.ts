import { distanceInKm, type DiscoveredEvent } from '../src/events/event-discovery.js'
import type { PublicEventPage, PublicEventRequest } from '../src/events/public-event-contract.js'
import { filterEventResults, defaultEventFilters } from '../src/events/event-filters.js'
import { normalizeLocationText } from '../src/events/event-country-names.js'
import { resolveEventLocation } from './event-location-resolver.js'
import { publicProviderRequests } from './public-event-providers.js'

export async function aggregatePublicEvents(search: PublicEventRequest): Promise<PublicEventPage> {
  const location = await resolveEventLocation(search)
  const requests = publicProviderRequests(location, search)
  const results = await Promise.allSettled(requests.map((request) => request.load()))
  if (results.every((result) => result.status === 'rejected')) throw new Error('Public events are unavailable right now. Please try again.')
  const sources = results.map((result, index) => ({ name: requests[index].name, url: requests[index].url.href, status: result.status === 'fulfilled' ? 'ok' as const : 'unavailable' as const, count: result.status === 'fulfilled' ? result.value.events.length : 0 }))
  const unique = new Map<string, DiscoveredEvent>()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const event of result.value.events) {
      if (search.query && event.source !== 'Eventbrite') {
        const normalized = normalizeLocationText(search.query)
        const categoryAliases: Record<string, string> = { musica: 'music', artes: 'arts', gastronomia: 'food', tecnologia: 'technology', esportes: 'sports', 'ao ar livre': 'outdoors' }
        if (!normalizeLocationText(`${event.title} ${event.description} ${event.venue} ${event.category}`).includes(categoryAliases[normalized] ?? normalized)) continue
      }
      if (location.kind === 'city' && !search.coordinates && location.latitude !== undefined && location.longitude !== undefined && event.latitude !== null && event.longitude !== null && distanceInKm({ latitude: location.latitude, longitude: location.longitude }, { latitude: event.latitude, longitude: event.longitude }) > 80) continue
      if (search.coordinates) {
        if (event.latitude === null || event.longitude === null) continue
        const distanceKm = distanceInKm(search.coordinates, { latitude: event.latitude, longitude: event.longitude })
        if (distanceKm > search.radiusKm) continue
        event.distanceKm = distanceKm
      }
      const identity = `${normalizeLocationText(event.title)}|${event.startsAt}|${event.countryCode}|${normalizeLocationText(event.city)}`
      if (!unique.has(identity)) unique.set(identity, event)
    }
  }
  return { events: filterEventResults([...unique.values()], search.filters ?? defaultEventFilters, { interests: [], radiusKm: search.radiusKm, budget: 'any' }).slice(0, 100), location, sources, page: search.page, hasMore: results.some((result) => result.status === 'fulfilled' && result.value.hasMore) }
}
