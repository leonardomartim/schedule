import { parseMunicipalEvents } from '../server/municipal-event-parser.js'

export async function GET(): Promise<Response> {
  try {
    const upstream = await fetch('https://spmaiscultura.prefeitura.sp.gov.br/', { signal: AbortSignal.timeout(8_000), headers: { Accept: 'text/html' } })
    if (!upstream.ok) throw new Error('Municipal feed unavailable')
    const html = await upstream.text()
    if (html.length > 2_000_000) throw new Error('Municipal feed exceeded size limit')
    const events = parseMunicipalEvents(html)
    return Response.json({ events, source: 'SP Mais Cultura', sourceUrl: 'https://spmaiscultura.prefeitura.sp.gov.br/', fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=1800, stale-while-revalidate=3600', 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    console.error('public-events: municipal feed could not be loaded or parsed')
    return Response.json({ error: 'Public events are unavailable right now. Please try again.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
