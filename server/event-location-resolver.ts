import type { EventSearch } from '../src/events/event-discovery.js'
import type { EventSearchLocation } from '../src/events/public-event-contract.js'
import { eventCountryCode, eventCountryName, normalizeLocationText } from '../src/events/event-country-names.js'
import { fetchPublicSource, isPublicRecord } from './public-source-records.js'

const cityAliases: Readonly<Record<string, string>> = { londres: 'London', toquio: 'Tokyo', tokio: 'Tokyo', 'nova york': 'New York', 'nova iorque': 'New York', 'sao francisco': 'San Francisco', pequim: 'Beijing', munique: 'Munich', colonia: 'Cologne', florença: 'Florence', roma: 'Rome', lisboa: 'Lisbon', osaka: 'Osaka' }
export async function resolveEventLocation(search: EventSearch): Promise<EventSearchLocation> {
  if (search.coordinates) {
    const url = new URL('https://photon.komoot.io/reverse')
    url.search = new URLSearchParams({ lat: String(search.coordinates.latitude), lon: String(search.coordinates.longitude), limit: '1', lang: 'en' }).toString()
    const result: unknown = JSON.parse(await fetchPublicSource(url))
    const first = isPublicRecord(result) && Array.isArray(result.features) ? result.features[0] as unknown : null
    const properties = isPublicRecord(first) && isPublicRecord(first.properties) ? first.properties : null
    if (!properties || typeof properties.city !== 'string' || typeof properties.countrycode !== 'string') throw new Error('Location not found. Try a city and country.')
    const code = properties.countrycode.toUpperCase()
    return { kind: 'city', label: `${properties.city}, ${eventCountryName(code)}`, city: properties.city, countryCode: code, countryName: eventCountryName(code), region: typeof properties.state === 'string' ? properties.state : undefined, ...search.coordinates }
  }
  const input = search.city.trim()
  if (!input) return { kind: 'highlights', label: 'International highlights' }
  const code = eventCountryCode(input)
  if (code) return { kind: 'country', label: eventCountryName(code), countryCode: code, countryName: eventCountryName(code) }
  const parts = input.split(',').map((part) => part.trim())
  const countryCode = search.countryCode ?? (parts.length > 1 ? eventCountryCode(parts[parts.length - 1]) : undefined)
  const cityName = cityAliases[normalizeLocationText(parts[0])] ?? parts[0]
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name: cityName, count: '10', language: 'en', format: 'json', ...(countryCode ? { countryCode } : {}) }).toString()
  const payload: unknown = JSON.parse(await fetchPublicSource(url))
  const candidates = isPublicRecord(payload) && Array.isArray(payload.results) ? payload.results.filter(isPublicRecord) : []
  const city = candidates.filter((candidate) => typeof candidate.name === 'string' && typeof candidate.country_code === 'string' && /^[A-Z]{2}$/.test(candidate.country_code) && (!countryCode || candidate.country_code === countryCode) && typeof candidate.latitude === 'number' && Number.isFinite(candidate.latitude) && Math.abs(candidate.latitude) <= 90 && typeof candidate.longitude === 'number' && Number.isFinite(candidate.longitude) && Math.abs(candidate.longitude) <= 180).sort((first, second) => Number(second.population ?? 0) - Number(first.population ?? 0))[0]
  if (!city) throw new Error('Location not found. Try a city and country.')
  const countryName = eventCountryName(String(city.country_code))
  return { kind: 'city', label: `${String(city.name)}, ${countryName}`, city: String(city.name), countryCode: String(city.country_code), countryName, region: typeof city.admin1 === 'string' ? city.admin1 : undefined, latitude: Number(city.latitude), longitude: Number(city.longitude) }
}
