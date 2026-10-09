import { describe, expect, it } from 'vitest'
import { addEventToAgenda, localDateKey, scheduleItemsForDate } from '../src/event-agenda'
import type { DiscoveredEvent } from '../src/events/event-discovery'
import type { ScheduleItem } from '../src/types'

const event: DiscoveredEvent = { id: 'concert', title: 'Concert', description: '', category: 'music', startsAt: new Date(2027, 0, 5, 18, 30).toISOString(), venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null }
describe('event agenda integration', () => {
  it('adds an event on its local day and prevents duplicate additions', () => {
    const items = addEventToAgenda([], event)
    expect(items[0]).toMatchObject({ title: 'Concert', date: '2027-01-05', time: '18:30', eventId: 'concert', category: 'personal', completed: false })
    expect(addEventToAgenda(items, event)).toBe(items)
    expect(scheduleItemsForDate(items, '2027-01-06')).toEqual([])
  })
  it('keeps legacy undated entries on today only and uses local dates around midnight', () => {
    const legacy: ScheduleItem = { id: 1, time: '09:00', title: 'Legacy', detail: '', category: 'focus', duration: '30 min', completed: false }
    expect(scheduleItemsForDate([legacy], '2027-01-05', '2027-01-05')).toEqual([legacy])
    expect(scheduleItemsForDate([legacy], '2027-01-06', '2027-01-05')).toEqual([])
    expect(localDateKey(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05')
  })
})
