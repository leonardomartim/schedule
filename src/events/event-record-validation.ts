import { eventInterests } from '../account/account-validation'
import type { DiscoveredEvent } from './event-discovery'

export function isDiscoveredEvent(value: unknown): value is DiscoveredEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  const validCoordinates = (event.latitude === null && event.longitude === null) ||
    (typeof event.latitude === 'number' && Number.isFinite(event.latitude) && Math.abs(event.latitude) <= 90 && typeof event.longitude === 'number' && Number.isFinite(event.longitude) && Math.abs(event.longitude) <= 180)
  return typeof event.id === 'string' && typeof event.title === 'string' && typeof event.description === 'string' &&
    typeof event.category === 'string' && eventInterests.some((interest) => interest === event.category) &&
    typeof event.startsAt === 'string' && Number.isFinite(Date.parse(event.startsAt)) &&
    typeof event.venue === 'string' && typeof event.city === 'string' && validCoordinates &&
    (event.price === null || (typeof event.price === 'number' && Number.isFinite(event.price) && event.price >= 0)) &&
    typeof event.currency === 'string' && /^[A-Z]{3}$/.test(event.currency) && (event.url === null || typeof event.url === 'string') &&
    (event.source === undefined || event.source === 'SP Mais Cultura')
}
