import { useEffect, useState, type ReactNode } from 'react'
import { ArrowUpRight, LocateFixed, CloudSun } from 'lucide-react'
import type { Coordinates } from './event-discovery'
import { loadLocalWeather, type LocalWeather } from './public-location-service'

interface LocationSummaryProps { coordinates: Coordinates; label: string; radiusKm: number; onClear: () => void }

export function LocationSummary({ coordinates, label, radiusKm, onClear }: LocationSummaryProps): ReactNode {
  const [weather, setWeather] = useState<LocalWeather | null>(null)
  const [weatherUnavailable, setWeatherUnavailable] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setWeather(null); setWeatherUnavailable(false)
    void loadLocalWeather(coordinates, controller.signal).then((result) => {
      if (!controller.signal.aborted) setWeather(result)
    }).catch(() => { if (!controller.signal.aborted) setWeatherUnavailable(true) })
    return () => controller.abort()
  }, [coordinates.latitude, coordinates.longitude])

  const mapUrl = `https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=13/${coordinates.latitude}/${coordinates.longitude}`
  return <aside className="location-summary" aria-label="Your search location">
    <span className="location-marker"><LocateFixed size={28} /></span>
    <div className="location-summary-copy"><span className="feature-kicker">Your search area · {radiusKm} km</span><h2>{label}</h2><p>{coordinates.latitude.toFixed(3)}, {coordinates.longitude.toFixed(3)} <a href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label="View search area on OpenStreetMap">View map <ArrowUpRight size={13} /></a></p><small>Approximate coordinates are shared with Open-Meteo for current weather.</small></div>
    <div className="location-weather" aria-live="polite"><CloudSun size={23} />{weather ? <><strong>{Math.round(weather.temperature)} °C</strong><span>{weather.description} · now</span></> : <span>{weatherUnavailable ? 'Weather is unavailable right now.' : 'Loading local weather…'}</span>}<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather by Open-Meteo</a></div>
    <button className="feature-text-button" type="button" onClick={onClear}>Clear location</button>
  </aside>
}
