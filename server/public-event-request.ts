import type { PublicEventRequest } from '../src/events/public-event-contract.js'
import { defaultEventFilters, validateEventFilters } from '../src/events/event-filters.js'
import { eventCategories } from '../src/events/event-discovery.js'

export function parsePublicEventRequest(request?: Request): PublicEventRequest {
  const params = new URL(request?.url ?? 'https://schedule.example/api/public-events').searchParams
  const city = (params.get('city') ?? '').trim()
  const query = (params.get('q') ?? '').trim()
  const radiusKm = Number(params.get('radius') ?? 25)
  const page = Number(params.get('page') ?? 1)
  const latitude = params.get('latitude'); const longitude = params.get('longitude')
  const countryCode = params.get('countryCode') ?? undefined
  if (city.length > 120 || query.length > 120 || /[<>\u0000-\u001f]|:\/\//.test(city) || (countryCode && !/^[A-Z]{2}$/.test(countryCode)) || !Number.isInteger(page) || page < 1 || page > 10 || !Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 100) throw new Error('Invalid event search.')
  const category = params.get('category') ?? 'all'; const budget = params.get('budget') ?? 'any'
  if ((category !== 'all' && !eventCategories.some((value) => value === category)) || !['any', 'free', 'paid'].includes(budget)) throw new Error('Invalid event filters.')
  const filters = { ...defaultEventFilters, category: category as typeof defaultEventFilters.category, budget: budget as typeof defaultEventFilters.budget, dateFrom: params.get('from') ?? '', dateTo: params.get('to') ?? '' }
  const invalidFilters = validateEventFilters(filters)
  if (invalidFilters) throw new Error(invalidFilters)
  if ((latitude === null) !== (longitude === null)) throw new Error('Invalid coordinates.')
  if (latitude !== null && longitude !== null) {
    const coordinates = { latitude: Number(latitude), longitude: Number(longitude) }
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(coordinates.latitude) || Math.abs(coordinates.latitude) > 90 || !Number.isFinite(coordinates.longitude) || Math.abs(coordinates.longitude) > 180) throw new Error('Invalid coordinates.')
    return { city, query, radiusKm, page, countryCode, filters, coordinates }
  }
  return { city, query, radiusKm, page, countryCode, filters }
}
