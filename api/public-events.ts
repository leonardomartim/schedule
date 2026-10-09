import { aggregatePublicEvents } from '../server/public-event-aggregation.js'
import { parsePublicEventRequest } from '../server/public-event-request.js'

export async function GET(request?: Request): Promise<Response> {
  let search: ReturnType<typeof parsePublicEventRequest>
  try { search = parsePublicEventRequest(request) }
  catch { return Response.json({ error: 'Invalid event search.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }) }
  try {
    const result = await aggregatePublicEvents(search)
    return Response.json({ ...result, fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': search.coordinates ? 'private, no-store' : result.sources.some((source) => source.status === 'unavailable') ? 'public, max-age=15, s-maxage=60' : 'public, max-age=60, s-maxage=1800, stale-while-revalidate=3600', 'X-Content-Type-Options': 'nosniff' } })
  } catch (failure: unknown) {
    const notFound = failure instanceof Error && failure.message.startsWith('Location not found')
    console.error('public-events: location or public sources could not be loaded')
    return Response.json({ error: notFound ? 'Location not found. Try a city and country.' : 'Public events are unavailable right now. Please try again.' }, { status: notFound ? 404 : 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
