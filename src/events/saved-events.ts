import type { DiscoveredEvent } from './event-discovery'
import { isDiscoveredEvent } from './event-record-validation'

const storageKey = (userId: string): string => `schedule.saved-events.v1.${userId}`

export function loadSavedEvents(userId: string): DiscoveredEvent[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]')
    return Array.isArray(stored) ? stored.filter(isDiscoveredEvent) : []
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
