import type { Coordinates } from './event-discovery'

export interface PublicCity extends Coordinates { id: number; label: string }
export interface LocalWeather { temperature: number; description: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function requestPublicJson(url: URL, failureMessage: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const abort = (): void => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 8_000)
  try {
    const response = await fetch(url.href, { signal: controller.signal })
    if (!response.ok) throw new Error(failureMessage)
    return await response.json() as unknown
  } catch {
    throw new Error(failureMessage)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export async function searchPublicCities(query: string, signal?: AbortSignal): Promise<PublicCity[]> {
  if (query.trim().length < 2) return []
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name: query.trim(), count: '5', language: 'en', format: 'json' }).toString()
  const data = await requestPublicJson(url, 'City lookup is unavailable. You can still search the catalog by city.', signal)
  if (!isRecord(data) || !Array.isArray(data.results)) return []
  return data.results.flatMap((city: unknown): PublicCity[] => {
    if (!isRecord(city) || typeof city.id !== 'number' || typeof city.name !== 'string' ||
      typeof city.latitude !== 'number' || typeof city.longitude !== 'number' || !Number.isFinite(city.latitude) ||
      !Number.isFinite(city.longitude) || Math.abs(city.latitude) > 90 || Math.abs(city.longitude) > 180) return []
    return [{ id: city.id, label: [city.name, city.admin1, city.country].filter((part): part is string => typeof part === 'string' && part.length > 0).join(', '), latitude: city.latitude, longitude: city.longitude }]
  })
}

function describeWeather(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'Rainy'
  if (code <= 77 || code === 85 || code === 86) return 'Snowy'
  if (code >= 95) return 'Thunderstorms'
  return 'Current conditions'
}

export async function loadLocalWeather(coordinates: Coordinates, signal?: AbortSignal): Promise<LocalWeather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({ latitude: coordinates.latitude.toFixed(2), longitude: coordinates.longitude.toFixed(2), current: 'temperature_2m,weather_code', timezone: 'auto' }).toString()
  const data = await requestPublicJson(url, 'Weather is unavailable right now.', signal)
  if (!isRecord(data) || !isRecord(data.current) || typeof data.current.temperature_2m !== 'number' ||
    !Number.isFinite(data.current.temperature_2m) || typeof data.current.weather_code !== 'number') throw new Error('Weather is unavailable right now.')
  return { temperature: data.current.temperature_2m, description: describeWeather(data.current.weather_code) }
}
