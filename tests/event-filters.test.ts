import { describe, expect, it } from 'vitest'
import { defaultEventFilters, filterEventResults, eventFilterDateBounds, validateEventFilters } from '../src/events/event-filters'
import type { DiscoveredEvent } from '../src/events/event-discovery'

const event: DiscoveredEvent = { id: 'music', title: 'Concert', description: '', category: 'music', startsAt: new Date(2027, 0, 5, 18).toISOString(), venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null, distanceKm: 2 }
const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const

describe('event filters', () => {
  it('combines category, price, dates and saved events without treating unknown prices as free', () => {
    const events = [event, { ...event, id: 'unknown', price: null }, { ...event, id: 'sport', category: 'sports' as const }]
    const filters = { ...defaultEventFilters, category: 'music' as const, budget: 'free' as const, dateFrom: '2027-01-05', dateTo: '2027-01-05' }
    expect(filterEventResults(events, filters, preferences, ['music'], true).map(({ id }) => id)).toEqual(['music'])
    expect(filterEventResults(events, { ...filters, dateFrom: '2027-01-06' }, preferences)).toEqual([])
  })
  it('sorts by nearest, date and price with unknown values last and never mutates results', () => {
    const events = [{ ...event, id: 'unknown', distanceKm: undefined, price: null }, { ...event, id: 'later', distanceKm: 5, price: 50, startsAt: new Date(2027, 0, 6, 18).toISOString() }, event]
    expect(filterEventResults(events, { ...defaultEventFilters, sort: 'nearest' }, preferences).map(({ id }) => id)).toEqual(['music', 'later', 'unknown'])
    expect(filterEventResults(events, { ...defaultEventFilters, sort: 'price' }, preferences).map(({ id }) => id)).toEqual(['music', 'later', 'unknown'])
    expect(filterEventResults(events, { ...defaultEventFilters, sort: 'soonest' }, preferences).at(-1)?.id).toBe('later')
    expect(events[0].id).toBe('unknown')
  })
  it('uses local calendar boundaries with an exclusive end and validates dates', () => {
    const bounds = eventFilterDateBounds({ ...defaultEventFilters, dateFrom: '2027-01-05', dateTo: '2027-01-05' })
    expect(bounds.after).toBe(new Date(2027, 0, 5).toISOString())
    expect(bounds.before).toBe(new Date(2027, 0, 6).toISOString())
    expect(validateEventFilters({ ...defaultEventFilters, dateFrom: '2027-02-30' })).toBeTruthy()
    expect(validateEventFilters({ ...defaultEventFilters, dateFrom: '2027-01-06', dateTo: '2027-01-05' })).toBeTruthy()
  })
})
