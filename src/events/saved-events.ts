import { eventInterests } from '../account/account-validation'
import type { DiscoveredEvent } from './event-discovery'

const storageKey = (userId: string): string => `schedule.saved-events.v1.${userId}`

function isSavedEvent(value: unknown): value is DiscoveredEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  return typeof event.id === 'string' && typeof event.title === 'string' && typeof event.description === 'string' &&
    typeof event.category === 'string' && eventInterests.some((interest) => interest === event.category) &&
    typeof event.startsAt === 'string' && Number.isFinite(Date.parse(event.startsAt)) &&
    typeof event.venue === 'string' && typeof event.city === 'string' &&
    typeof event.latitude === 'number' && Number.isFinite(event.latitude) && Math.abs(event.latitude) <= 90 &&
    typeof event.longitude === 'number' && Number.isFinite(event.longitude) && Math.abs(event.longitude) <= 180 &&
    (event.price === null || (typeof event.price === 'number' && Number.isFinite(event.price) && event.price >= 0)) &&
    typeof event.currency === 'string' && /^[A-Z]{3}$/.test(event.currency) && (event.url === null || typeof event.url === 'string')
}

export function loadSavedEvents(userId: string): DiscoveredEvent[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]')
    return Array.isArray(stored) ? stored.filter(isSavedEvent) : []
  } catch { return [] }
}

export function saveSavedEvents(userId: string, events: DiscoveredEvent[]): boolean {
  try {
    const snapshots = events.map((event) => { const snapshot = { ...event }; delete snapshot.distanceKm; return snapshot })
    localStorage.setItem(storageKey(userId), JSON.stringify(snapshots))
    return true
  } catch { return false }
}

export function toggleSavedEvent(events: DiscoveredEvent[], event: DiscoveredEvent): DiscoveredEvent[] {
  return events.some((saved) => saved.id === event.id) ? events.filter((saved) => saved.id !== event.id) : [...events, event]
}
