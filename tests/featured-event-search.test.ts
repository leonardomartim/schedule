import { describe, expect, it } from 'vitest'
import { filterFeaturedEvents } from '../src/events/featured-events'
const event = { id: 'official', title: 'Concerto de música', description: '', category: 'music', startsAt: '2027-01-05T18:00:00Z', venue: 'Centro Cultural', city: 'São Paulo', latitude: null, longitude: null, price: null, currency: 'BRL', url: null } as const
describe('public feed search', () => {
  it('matches cities and keywords without accents and never claims unknown venue distances', () => {
    expect(filterFeaturedEvents([event], { city: 'Sao Paulo', query: 'musica', radiusKm: 25 })).toEqual([event])
    expect(filterFeaturedEvents([event], { city: 'Recife', query: '', radiusKm: 25 })).toEqual([])
    expect(filterFeaturedEvents([event], { city: '', query: '', coordinates: { latitude: -23.55, longitude: -46.63 }, radiusKm: 25 })).toEqual([])
  })
})
