import type { DiscoveredEvent } from '../src/events/event-discovery.js'
import { classifyPublicEvent } from './event-source-category.js'
import { sourceEventStart } from './event-start-time.js'
import { isPublicRecord, publicRecordText, readPublicJson, sourceEventUrl } from './public-source-records.js'

export function parseEventbriteEvents(html: string, now = new Date()): { events: DiscoveredEvent[]; pageCount: number } {
  const assignment = /window\.__SERVER_DATA__\s*=\s*(?=\{)/.exec(html)
  if (!assignment) throw new Error('Eventbrite event format changed.')
  const root = readPublicJson(html, assignment.index + assignment[0].length)
  const search = isPublicRecord(root) && isPublicRecord(root.search_data) ? root.search_data : null
  const batch = search && isPublicRecord(search.events) ? search.events : null
  if (!batch || !Array.isArray(batch.results)) throw new Error('Eventbrite event format changed.')
  const events = new Map<string, DiscoveredEvent>()
  for (const record of batch.results) {
    if (!isPublicRecord(record) || typeof record.id !== 'string' || typeof record.name !== 'string' || record.is_cancelled || record.is_online_event || record.is_protected_event || record.hide_start_date) continue
    const url = sourceEventUrl(record.url, 'eventbrite')
    const startsAt = typeof record.start_date === 'string' && typeof record.start_time === 'string' && typeof record.timezone === 'string' ? sourceEventStart(record.start_date, record.start_time, record.timezone) : null
    if (!url || !startsAt || Date.parse(startsAt) <= now.getTime() || !isPublicRecord(record.primary_venue)) continue
    const venue = record.primary_venue
    const address = isPublicRecord(venue.address) ? venue.address : null
    if (!address || typeof address.city !== 'string' || typeof address.country !== 'string' || !/^[A-Z]{2}$/.test(address.country)) continue
    const latitude = address.latitude === null || address.latitude === undefined || address.latitude === '' ? NaN : Number(address.latitude)
    const longitude = address.longitude === null || address.longitude === undefined || address.longitude === '' ? NaN : Number(address.longitude)
    const validCoordinates = Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    const tags = Array.isArray(record.tags) ? record.tags.filter(isPublicRecord).map((tag) => publicRecordText(tag.display_name)).join(' ') : ''
    const id = `eventbrite:${record.id}`
    events.set(id, { id, title: publicRecordText(record.name), description: publicRecordText(record.summary).slice(0, 280), category: classifyPublicEvent(`${tags} ${record.name}`), startsAt, venue: [publicRecordText(venue.name), publicRecordText(address.address_1)].filter(Boolean).join(' · '), city: publicRecordText(address.city), countryCode: address.country, timeZone: String(record.timezone), latitude: validCoordinates ? latitude : null, longitude: validCoordinates ? longitude : null, price: null, currency: null, url, source: 'Eventbrite' })
  }
  const pagination = isPublicRecord(batch.pagination) ? batch.pagination : null
  return { events: [...events.values()], pageCount: pagination && typeof pagination.page_count === 'number' ? pagination.page_count : 1 }
}
