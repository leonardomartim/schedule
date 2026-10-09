import type { DiscoveredEvent } from '../src/events/event-discovery.js'
import type { EventInterest } from '../src/account/account-validation.js'

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function publicText(value: unknown): string {
  if (typeof value !== 'string') return ''
  const entities: Record<string, string> = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }
  return value.replace(/<[^>]*>/g, ' ').replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (match: string, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity] ?? match
    const code = Number.parseInt(entity.slice(entity[1] === 'x' ? 2 : 1), entity[1] === 'x' ? 16 : 10)
    return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
  }).replace(/&[a-z#\d]*(?=\.{3}$)/gi, '').replace(/\s+/g, ' ').trim()
}
function eventCategory(type: string): EventInterest {
  if (/musical|show|concerto|música|samba/i.test(type)) return 'music'
  if (/gastronom|culinária/i.test(type)) return 'food'
  if (/esport/i.test(type)) return 'sports'
  if (/tecnolog/i.test(type)) return 'technology'
  return 'arts'
}
function readJsonArray(text: string, start: number): unknown[] {
  let depth = 0; let quoted = false; let escaped = false
  for (let position = start; position < text.length; position += 1) {
    const character = text[position]
    if (quoted) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === '"') quoted = false; continue }
    if (character === '"') quoted = true
    else if (character === '[') depth += 1
    else if (character === ']' && --depth === 0) { const parsed: unknown = JSON.parse(text.slice(start, position + 1)); return Array.isArray(parsed) ? parsed : [] }
  }
  throw new Error('Municipal event format changed.')
}
function flattenRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(flattenRecords)
  return isRecord(value) ? [value] : []
}
export function parseMunicipalEvents(html: string, now = new Date()): DiscoveredEvent[] {
  // Decode public JSON strings only; never evaluate scripts from the upstream page.
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)].map((match) => JSON.parse(match[1]) as string).join('')
  const records: Record<string, unknown>[] = []
  const batches = [...chunks.matchAll(/"initialEvents":\s*(?=\[)/g)]
  if (!batches.length) throw new Error('Municipal event format changed.')
  for (const match of batches) records.push(...flattenRecords(readJsonArray(chunks, (match.index ?? 0) + match[0].length)))
  const events = new Map<string, DiscoveredEvent>()
  for (const record of records) {
    if (typeof record.id !== 'string' || typeof record.name !== 'string' || typeof record.nextPresentationDate !== 'string' || !Array.isArray(record.schedules)) continue
    const startsAt = Date.parse(record.nextPresentationDate)
    if (!Number.isFinite(startsAt) || startsAt <= now.getTime()) continue
    const schedules = record.schedules.filter(isRecord)
    const schedule = schedules.find((item) => typeof item.startDate === 'string' && Date.parse(item.startDate) === startsAt) ?? schedules[0]
    if (!schedule || typeof schedule.placeName !== 'string' || typeof schedule.fullAddress !== 'string') continue
    const id = `sp-culture:${record.id}:${new Date(startsAt).toISOString()}`
    events.set(id, { id, title: publicText(record.name), description: publicText(record.description).slice(0, 220), category: eventCategory(publicText(record.eventTypeName)), startsAt: new Date(startsAt).toISOString(), venue: `${publicText(schedule.placeName)} · ${publicText(schedule.fullAddress)}`, city: 'São Paulo', latitude: null, longitude: null, price: null, currency: 'BRL', url: 'https://spmaiscultura.prefeitura.sp.gov.br/todos-eventos', source: 'SP Mais Cultura' })
  }
  return [...events.values()].sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt)).slice(0, 60)
}
