export function isPublicRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function publicRecordText(value: unknown): string {
  if (typeof value !== 'string') return ''
  const entities: Record<string, string> = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }
  return value.replace(/<[^>]*>/g, ' ').replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (match: string, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity] ?? match
    const hex = entity[1]?.toLowerCase() === 'x'
    const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
    return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
  }).replace(/\s+/g, ' ').trim()
}
export function readPublicJson(text: string, start: number): unknown {
  const opening = text[start]
  if (opening !== '{' && opening !== '[') throw new Error('Public event format changed.')
  let depth = 0; let quoted = false; let escaped = false
  for (let position = start; position < text.length; position += 1) {
    const character = text[position]
    if (quoted) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === '"') quoted = false; continue }
    if (character === '"') quoted = true
    else if (character === '{' || character === '[') depth += 1
    else if ((character === '}' || character === ']') && --depth === 0) return JSON.parse(text.slice(start, position + 1)) as unknown
  }
  throw new Error('Public event format changed.')
}
export function decodePublicFlightChunks(html: string): string {
  return [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)].map((match) => JSON.parse(match[1]) as string).join('')
}
export async function fetchPublicSource(url: URL | string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { Accept: 'text/html, application/json', 'User-Agent': 'ScheduleEventDiscovery/0.4 (+https://schedule-omega-ecru.vercel.app/)' } })
  if (!response.ok) throw new Error('Public source unavailable')
  if (Number(response.headers.get('Content-Length')) > 3_000_000) throw new Error('Public source exceeded size limit')
  const reader = response.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder(); let text = ''; let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 3_000_000) { await reader.cancel(); throw new Error('Public source exceeded size limit') }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally { reader.releaseLock() }
}
export function sourceEventUrl(value: unknown, source: 'eventbrite' | 'sympla'): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const hosts = source === 'sympla' ? ['sympla.com.br', 'www.sympla.com.br'] : ['eventbrite.com', 'www.eventbrite.com', 'www.eventbrite.co.uk', 'www.eventbrite.com.au', 'www.eventbrite.ca', 'www.eventbrite.de', 'www.eventbrite.fr', 'www.eventbrite.es', 'www.eventbrite.it', 'www.eventbrite.ie', 'www.eventbrite.co.nz', 'www.eventbrite.sg', 'www.eventbrite.hk', 'www.eventbrite.pt', 'www.eventbrite.com.br', 'www.eventbrite.jp']
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
