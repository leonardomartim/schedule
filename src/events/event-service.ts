import type { SupabaseClient } from '@supabase/supabase-js'
import type { EventPreferences, EventInterest } from '../account/account-validation'
import { rankUpcomingEvents, validateEventSearch, type DiscoveredEvent, type EventSearch, type Coordinates } from './event-discovery'

interface CatalogEvent {
  id: string; title: string; description: string; category: EventInterest; starts_at: string
  venue: string; city: string; latitude: number; longitude: number; price: number | null
  currency: string; url: string | null; distance_km: number | null
}

export async function searchCatalogEvents(client: Pick<SupabaseClient, 'rpc'>, search: EventSearch, preferences: EventPreferences): Promise<DiscoveredEvent[]> {
  const validation = validateEventSearch(search)
  if (validation) throw new Error(validation)
  const { data, error } = await client.rpc('search_upcoming_events', {
    p_latitude: search.coordinates?.latitude ?? null, p_longitude: search.coordinates?.longitude ?? null,
    p_city: search.coordinates ? null : search.city.trim(), p_radius_km: search.radiusKm,
    p_query: search.query.trim(), p_interests: [...preferences.interests], p_budget: preferences.budget,
  })
  if (error) throw new Error('Event search is unavailable right now. Please try again shortly.')
  const events: DiscoveredEvent[] = ((data ?? []) as CatalogEvent[]).map((event) => ({
    id: event.id, title: event.title, description: event.description, category: event.category,
    startsAt: event.starts_at, venue: event.venue, city: event.city, latitude: event.latitude,
    longitude: event.longitude, price: event.price, currency: event.currency, url: event.url,
    distanceKm: event.distance_km ?? undefined,
  }))
  return rankUpcomingEvents(events, preferences)
}

export function requestDeviceLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Location is unavailable in this browser. Enter a city instead.')); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(error.code === 1 ? 'Location access was denied. Enter a city to search.' : 'Your location could not be found. Try again or enter a city.')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  })
}
