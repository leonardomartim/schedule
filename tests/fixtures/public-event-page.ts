import type { DiscoveredEvent } from '../../src/events/event-discovery'
import type { PublicEventPage } from '../../src/events/public-event-contract'
export function publicEventPage(events: DiscoveredEvent[] = []): PublicEventPage {
  return { events, location: { kind: 'highlights', label: 'International highlights' }, sources: [], page: 1, hasMore: false }
}
