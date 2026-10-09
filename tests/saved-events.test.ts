// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSavedEvents, saveSavedEvents, toggleSavedEvent } from '../src/events/saved-events'
import type { DiscoveredEvent } from '../src/events/event-discovery'

afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })
const event: DiscoveredEvent = { id: 'concert', title: 'Concert', description: '', category: 'music', startsAt: '2027-01-05T18:00:00Z', venue: 'Hall', city: 'São Paulo', latitude: 0, longitude: 0, price: 0, currency: 'BRL', url: null }
describe('account saved events', () => {
  it('does not persist distances derived from the user search location', () => {
    saveSavedEvents('first', [{ ...event, distanceKm: 1.234 }])
    expect(loadSavedEvents('first')[0]).not.toHaveProperty('distanceKm')
  })
  it('persists full events per account and toggles without duplicates', () => {
    const saved = toggleSavedEvent([], event)
    saveSavedEvents('first', saved)
    expect(loadSavedEvents('first')).toEqual([event])
    expect(loadSavedEvents('second')).toEqual([])
    expect(toggleSavedEvent(saved, event)).toEqual([])
  })
  it('recovers from corrupt data and does not crash when storage is blocked', () => {
    localStorage.setItem('schedule.saved-events.v1.first', '[{"id":1}]')
    expect(loadSavedEvents('first')).toEqual([])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(saveSavedEvents('first', [event])).toBe(false)
  })
})
