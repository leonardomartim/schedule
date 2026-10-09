import type { EventInterest, EventPreferences } from '../account/account-validation'
import type { EventFilters } from './event-filters'

export interface Coordinates { latitude: number; longitude: number }
export interface EventSearch { city: string; coordinates?: Coordinates; query: string; radiusKm: number; filters?: EventFilters }
export interface DiscoveredEvent {
  latitude: number | null
  longitude: number | null
  id: string
  title: string
  description: string
  category: EventInterest
  startsAt: string
  venue: string
  city: string
  price: number | null
  currency: string
  url: string | null
  distanceKm?: number
  source?: 'SP Mais Cultura'
}

export function distanceInKm(first: Coordinates, second: Coordinates): number {
  const radians = (degrees: number): number => degrees * Math.PI / 180
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))))
}

export function validateEventSearch(search: EventSearch): string | null {
  if (!Number.isFinite(search.radiusKm) || search.radiusKm < 1 || search.radiusKm > 100) return 'Choose a search radius between 1 and 100 km.'
  if (search.coordinates) {
    const { latitude, longitude } = search.coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return 'Your location could not be read. Try entering a city instead.'
  } else if (search.city.trim().length < 2) return 'Enter a city or use your current location.'
  if (search.query.length > 120 || search.city.length > 120) return 'Keep your search under 120 characters.'
  return null
}

export function eventPreferenceScore(event: DiscoveredEvent, preferences: EventPreferences): number {
  const interestScore = preferences.interests.includes(event.category) ? 2 : 0
  const budgetScore = (preferences.budget === 'free' && event.price === 0) ||
    (preferences.budget === 'paid' && event.price !== null && event.price > 0) ? 1 : 0
  return interestScore + budgetScore
}

export function rankUpcomingEvents(events: DiscoveredEvent[], preferences: EventPreferences, now = new Date()): DiscoveredEvent[] {
  return events.filter((event) => Date.parse(event.startsAt) > now.getTime()).sort((first, second) =>
    eventPreferenceScore(second, preferences) - eventPreferenceScore(first, preferences) ||
    Date.parse(first.startsAt) - Date.parse(second.startsAt))
}

export function safeEventUrl(url: string | null): string | undefined {
  if (!url) return undefined
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : undefined } catch { return undefined }
}
