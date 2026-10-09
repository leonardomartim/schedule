import type { DiscoveredEvent } from './events/event-discovery'
import type { ScheduleItem } from './types'

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function scheduleItemsForDate(items: ScheduleItem[], date: string, today = localDateKey(new Date())): ScheduleItem[] {
  return items.filter((item) => item.date ? item.date === date : date === today)
}

export function addEventToAgenda(items: ScheduleItem[], event: DiscoveredEvent): ScheduleItem[] {
  if (items.some((item) => item.eventId === event.id)) return items
  const date = new Date(event.startsAt)
  const item: ScheduleItem = {
    id: Math.max(Date.now(), ...items.map((existing) => existing.id + 1)), eventId: event.id,
    title: event.title, date: localDateKey(date), time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    detail: `${event.venue} · ${event.city}`, category: ['sports', 'outdoors'].includes(event.category) ? 'health' : 'personal',
    duration: 'Event', completed: false,
  }
  return [...items, item]
}
