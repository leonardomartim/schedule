import type { Coordinates, DiscoveredEvent, EventSearch } from './event-discovery'

export interface EventSearchLocation extends Partial<Coordinates> {
  kind: 'city' | 'country' | 'highlights'
  label: string
  city?: string
  countryCode?: string
  countryName?: string
  region?: string
}
export interface PublicEventSource {
  name: NonNullable<DiscoveredEvent['source']>
  url: string
  status: 'ok' | 'unavailable'
  count: number
}
export interface PublicEventPage {
  events: DiscoveredEvent[]
  location: EventSearchLocation
  sources: PublicEventSource[]
  page: number
  hasMore: boolean
}
export interface PublicEventRequest extends EventSearch { page: number; countryCode?: string }
