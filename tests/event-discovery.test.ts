import { describe, expect, it } from 'vitest'
import { distanceInKm, rankUpcomingEvents, validateEventSearch, type DiscoveredEvent } from '../src/events/event-discovery'
import { parsePreferences, validateRegistration } from '../src/account/account-validation'

const now = new Date('2026-09-21T12:00:00Z')
const preferences = { interests: ['music'], radiusKm: 25, budget: 'free' } as const
const event: DiscoveredEvent = {
  id: 'concert', title: 'Live music', description: '', category: 'music',
  startsAt: '2026-09-22T18:00:00Z', venue: 'Town Hall', city: 'São Paulo',
  latitude: -23.55, longitude: -46.63, price: 0, currency: 'BRL', url: 'https://example.com/event',
}

describe('registration and preference validation', () => {
  it('requires a valid username, email, and strong enough password', () => {
    expect(validateRegistration({ username: 'ab', email: 'bad', password: 'short' })).toBeTruthy()
    expect(validateRegistration({ username: 'leonardo_1', email: 'leo@example.com', password: 'long-password' })).toBeNull()
  })
  it('only accepts complete answers to all three questions', () => {
    expect(parsePreferences(preferences)).toEqual(preferences)
    for (const invalid of [null, {}, { ...preferences, interests: [] }, { ...preferences, radiusKm: 0 },
      { ...preferences, budget: 'unknown' }, { ...preferences, interests: ['invented'] }]) {
      expect(parsePreferences(invalid)).toBeNull()
    }
  })
})

describe('nearby event discovery', () => {
  it('computes distance in kilometers including the equator and date line', () => {
    expect(distanceInKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2)
    expect(distanceInKm({ latitude: 0, longitude: 179.99 }, { latitude: 0, longitude: -179.99 })).toBeLessThan(3)
  })
  it('requires a city or valid coordinates and a bounded radius', () => {
    expect(validateEventSearch({ city: '', query: '', radiusKm: 25 })).toBeTruthy()
    expect(validateEventSearch({ city: 'São Paulo', query: '', radiusKm: 25 })).toBeNull()
    expect(validateEventSearch({ coordinates: { latitude: 0, longitude: 0 }, city: '', query: '', radiusKm: 25 })).toBeNull()
    expect(validateEventSearch({ coordinates: { latitude: 91, longitude: 0 }, city: '', query: '', radiusKm: 25 })).toBeTruthy()
    expect(validateEventSearch({ city: 'Paris', query: '', radiusKm: 10000 })).toBeTruthy()
  })
  it('excludes past events and invalid dates, and prioritizes matching interests and budget', () => {
    const results = rankUpcomingEvents([
      { ...event, id: 'past', startsAt: '2026-09-20T10:00:00Z' },
      { ...event, id: 'invalid', startsAt: 'invalid' },
      { ...event, id: 'sports', category: 'sports' },
      { ...event, id: 'paid', price: 100 }, event,
    ], preferences, now)
    expect(results.map(({ id }) => id)).toEqual(['concert', 'paid', 'sports'])
  })
  it('does not mislabel an unknown price as free and uses soonest date to break ties', () => {
    const results = rankUpcomingEvents([
      { ...event, id: 'unknown', price: null },
      { ...event, id: 'later', startsAt: '2026-09-24T18:00:00Z' }, event,
    ], preferences, now)
    expect(results.map(({ id }) => id)).toEqual(['concert', 'later', 'unknown'])
  })
})
