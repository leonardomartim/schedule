import type { DiscoveredEvent } from '../src/events/event-discovery.js'
import type { EventSearchLocation, PublicEventRequest, PublicEventSource } from '../src/events/public-event-contract.js'
import { eventLocationSlug, normalizeLocationText } from '../src/events/event-country-names.js'
import { fetchPublicSource } from './public-source-records.js'
import { parseEventbriteEvents } from './eventbrite-event-parser.js'
import { parseSymplaEvents } from './sympla-event-parser.js'
import { parseMunicipalEvents } from './municipal-event-parser.js'

export interface PublicProviderRequest { name: PublicEventSource['name']; url: URL; load: () => Promise<{ events: DiscoveredEvent[]; hasMore: boolean }> }
const brazilianStates: Readonly<Record<string, string>> = { acre: 'ac', alagoas: 'al', amapa: 'ap', amazonas: 'am', bahia: 'ba', ceara: 'ce', 'distrito federal': 'df', 'espirito santo': 'es', goias: 'go', maranhao: 'ma', 'mato grosso': 'mt', 'mato grosso do sul': 'ms', 'minas gerais': 'mg', para: 'pa', paraiba: 'pb', parana: 'pr', pernambuco: 'pe', piaui: 'pi', 'rio de janeiro': 'rj', 'rio grande do norte': 'rn', 'rio grande do sul': 'rs', rondonia: 'ro', roraima: 'rr', 'santa catarina': 'sc', 'sao paulo': 'sp', sergipe: 'se', tocantins: 'to' }
const categoryKeywords: Readonly<Record<string, string>> = { musica: 'music', music: 'music', artes: 'arts', arts: 'arts', gastronomia: 'food', food: 'food', 'ao ar livre': 'outdoors', tecnologia: 'technology', technology: 'technology', esportes: 'sports', sports: 'sports' }
function eventbriteRequest(location: EventSearchLocation, search: PublicEventRequest): PublicProviderRequest {
  const country = eventLocationSlug(location.countryName ?? '')
  const city = location.city ? eventLocationSlug(location.city) : ''
  const url = new URL(`https://www.eventbrite.com/d/${country}${city ? `--${city}` : ''}/all-events/`)
  url.searchParams.set('page', String(search.page))
  const keyword = search.query || (search.filters?.category && !['all', 'other'].includes(search.filters.category) ? search.filters.category : '')
  if (keyword) url.searchParams.set('q', categoryKeywords[normalizeLocationText(keyword)] ?? keyword)
  if (search.filters?.dateFrom) url.searchParams.set('start_date', search.filters.dateFrom)
  if (search.filters?.dateTo) url.searchParams.set('end_date', search.filters.dateTo)
  return { name: 'Eventbrite', url, load: async () => { const result = parseEventbriteEvents(await fetchPublicSource(url)); return { events: result.events.filter((event) => event.countryCode === location.countryCode), hasMore: search.page < Math.min(10, result.pageCount) } } }
}
function symplaRequest(location: EventSearchLocation): PublicProviderRequest | null {
  const state = location.region ? brazilianStates[normalizeLocationText(location.region)] ?? (/^[a-z]{2}$/i.test(location.region) ? location.region.toLowerCase() : undefined) : undefined
  if (location.city && !state) return null
  const url = new URL(`https://www.sympla.com.br/eventos${location.city ? `/${eventLocationSlug(location.city)}-${state}` : ''}`)
  return { name: 'Sympla', url, load: async () => ({ events: parseSymplaEvents(await fetchPublicSource(url)).filter((event) => !location.city || normalizeLocationText(event.city) === normalizeLocationText(location.city)), hasMore: false }) }
}
export function publicProviderRequests(location: EventSearchLocation, search: PublicEventRequest): PublicProviderRequest[] {
  if (location.kind === 'highlights') {
    const brazil: EventSearchLocation = { kind: 'country', label: 'Brazil', countryCode: 'BR', countryName: 'Brazil' }
    return [eventbriteRequest({ kind: 'country', label: 'Japan', countryCode: 'JP', countryName: 'Japan' }, search), eventbriteRequest({ kind: 'city', city: 'London', label: 'London', countryCode: 'GB', countryName: 'United Kingdom' }, search), ...(search.page === 1 ? [symplaRequest(brazil)!] : [])]
  }
  const requests = [eventbriteRequest(location, search)]
  if (location.countryCode === 'BR' && search.page === 1) {
    const sympla = symplaRequest(location)
    if (sympla) requests.push(sympla)
    if (location.kind === 'country' || normalizeLocationText(location.city ?? '') === 'sao paulo') {
      const url = new URL('https://spmaiscultura.prefeitura.sp.gov.br/')
      requests.push({ name: 'SP Mais Cultura', url, load: async () => ({ events: parseMunicipalEvents(await fetchPublicSource(url)).map((event) => ({ ...event, countryCode: 'BR', timeZone: 'America/Sao_Paulo' })), hasMore: false }) })
    }
  }
  return requests
}
