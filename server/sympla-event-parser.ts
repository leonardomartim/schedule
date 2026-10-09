import type { DiscoveredEvent } from '../src/events/event-discovery.js'
import { classifyPublicEvent } from './event-source-category.js'
import { brazilianEventTimeZone } from './brazilian-event-timezones.js'
import { decodePublicFlightChunks, isPublicRecord, publicRecordText, readPublicJson, sourceEventUrl } from './public-source-records.js'

export function parseSymplaEvents(html: string, now = new Date()): DiscoveredEvent[] {
  const chunks = decodePublicFlightChunks(html)
  const batches = [...chunks.matchAll(/"data":\s*(?=\[)/g)]
  if (!batches.length) {
    if (chunks.includes('"components":') && chunks.includes('"data":null')) return []
    throw new Error('Sympla event format changed.')
  }
  const events = new Map<string, DiscoveredEvent>()
  for (const match of batches) {
    const records = readPublicJson(chunks, match.index + match[0].length)
    if (!Array.isArray(records)) continue
    for (const record of records) {
      if (!isPublicRecord(record) || (typeof record.id !== 'number' && typeof record.id !== 'string') || typeof record.name !== 'string' || typeof record.start_date !== 'string' || !isPublicRecord(record.location)) continue
      const startsAt = Date.parse(record.start_date)
      const url = sourceEventUrl(record.url, 'sympla')
      const location = record.location
      if (!Number.isFinite(startsAt) || startsAt <= now.getTime() || !url || typeof location.city !== 'string' || record.event_type === 'ONLINE') continue
      const validCoordinates = typeof location.lat === 'number' && Number.isFinite(location.lat) && Math.abs(location.lat) <= 90 && typeof location.lon === 'number' && Number.isFinite(location.lon) && Math.abs(location.lon) <= 180
      const id = `sympla:${record.id}`
      events.set(id, { id, title: publicRecordText(record.name), description: publicRecordText(record.description).slice(0, 280), category: classifyPublicEvent(record.name), startsAt: new Date(startsAt).toISOString(), venue: [publicRecordText(location.name), publicRecordText(location.address)].filter(Boolean).join(' · '), city: publicRecordText(location.city), countryCode: 'BR', region: publicRecordText(location.state), timeZone: brazilianEventTimeZone(publicRecordText(location.state)), latitude: validCoordinates ? location.lat as number : null, longitude: validCoordinates ? location.lon as number : null, price: null, currency: 'BRL', url, source: 'Sympla' })
    }
  }
  return [...events.values()]
}
