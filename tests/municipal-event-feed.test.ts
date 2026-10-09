import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseMunicipalEvents } from '../server/municipal-event-parser'

const publicEvent = { id: 'real-event', name: 'Concerto público', description: '<p>Música&nbsp;ao vivo &amp; cultura</p>', eventTypeName: 'Concerto', nextPresentationDate: '2027-01-05T21:00:00+00:00', schedules: [{ id: 'session-1', startDate: '2027-01-05T21:00:00+00:00', placeName: 'Centro Cultural', fullAddress: 'Rua Vergueiro, 1000 - São Paulo - SP' }] }
function sourceHtml(events: unknown[]): string {
  const data = `1:${JSON.stringify(['$', 'section', null, { initialEvents: [events, events] }])}\n`
  const midpoint = Math.floor(data.length / 2)
  return `<script>self.__next_f.push(${JSON.stringify([1, data.slice(0, midpoint)])})</script><script>self.__next_f.push(${JSON.stringify([1, data.slice(midpoint)])})</script>`
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('official municipal event feed', () => {
  it('accepts a genuinely empty agenda and removes broken trailing HTML entities', () => {
    expect(parseMunicipalEvents(sourceHtml([]))).toEqual([])
    const result = parseMunicipalEvents(sourceHtml([{ ...publicEvent, description: 'Uma apresentação&nbsp...' }]))
    expect(result[0].description).toBe('Uma apresentação...')
  })
  it('reads public structured records without evaluating scripts and omits expired duplicates and invalid dates', () => {
    const html = sourceHtml([publicEvent, { ...publicEvent, id: 'expired', nextPresentationDate: '2020-01-01', schedules: [{ ...publicEvent.schedules[0], startDate: '2020-01-01' }] }, { ...publicEvent, id: 'invalid', nextPresentationDate: 'wrong', schedules: [] }])
    const result = parseMunicipalEvents(html, new Date('2026-10-09'))
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'Concerto público', description: 'Música ao vivo & cultura', category: 'music', startsAt: '2027-01-05T21:00:00.000Z', latitude: null, longitude: null, price: null, source: 'SP Mais Cultura' })
    expect(result[0].url).toBe('https://spmaiscultura.prefeitura.sp.gov.br/todos-eventos')
    expect(() => parseMunicipalEvents('<script>throw new Error("bad")</script>')).toThrow(/format/i)
  })
})
