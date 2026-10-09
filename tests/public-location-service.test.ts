import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchPublicCities, loadLocalWeather } from '../src/events/public-location-service'

afterEach(() => vi.unstubAllGlobals())

describe('public location APIs', () => {
  it('encodes city names and validates coordinates from the public response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [
      { id: 1, name: 'São Paulo', admin1: 'São Paulo', country: 'Brazil', latitude: -23.55, longitude: -46.63 },
      { id: 2, name: 'Invalid', latitude: 100, longitude: 0 },
    ] }) })
    vi.stubGlobal('fetch', fetchMock)
    const cities = await searchPublicCities(' São Paulo ')
    expect(cities).toEqual([{ id: 1, label: 'São Paulo, São Paulo, Brazil', latitude: -23.55, longitude: -46.63 }])
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('name')).toBe('São Paulo')
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
  it('does not request short city names and reports network errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchPublicCities('a')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(searchPublicCities('London')).rejects.toThrow('City lookup')
  })
  it('requests rounded coordinates for current weather and rejects malformed payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: 23.4, weather_code: 3 } }) })
    vi.stubGlobal('fetch', fetchMock)
    expect(await loadLocalWeather({ latitude: -23.55678, longitude: -46.63876 })).toEqual({ temperature: 23.4, description: 'Cloudy' })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.searchParams.get('latitude')).toBe('-23.56')
    expect(url.searchParams.get('current')).toBe('temperature_2m,weather_code')
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: 'bad' } }) })
    await expect(loadLocalWeather({ latitude: 0, longitude: 0 })).rejects.toThrow('Weather')
  })
})
