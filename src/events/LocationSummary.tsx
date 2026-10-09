import { useEffect, useState, type ReactNode } from 'react'
import { ArrowUpRight, LocateFixed, CloudSun } from 'lucide-react'
import type { Coordinates } from './event-discovery'
import { loadLocalWeather, type LocalWeather } from './public-location-service'
import { usePresentation } from '../presentation/PresentationProvider'

interface LocationSummaryProps { coordinates: Coordinates; label: string; radiusKm?: number; onClear: () => void }

export function LocationSummary({ coordinates, label, radiusKm, onClear }: LocationSummaryProps): ReactNode {
  const { t } = usePresentation()
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
  return <aside className="location-summary" aria-label={t('Your search location')}>
    <span className="location-marker"><LocateFixed size={28} /></span>
    <div className="location-summary-copy"><span className="feature-kicker">{radiusKm ? t('Your search area · {radius} km', { radius: radiusKm }) : t('Selected city')}</span><h2>{label}</h2><p>{coordinates.latitude.toFixed(3)}, {coordinates.longitude.toFixed(3)} <a href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={t('View search area on OpenStreetMap')}>{t('View map')}<ArrowUpRight size={13} /></a></p><small>{t('Approximate coordinates are shared with Open-Meteo for current weather.')}</small></div>
    <div className="location-weather" aria-live="polite"><CloudSun size={23} />{weather ? <><strong>{Math.round(weather.temperature)} °C</strong><span>{t(weather.description)} · {t('now')}</span></> : <span>{t(weatherUnavailable ? 'Weather is unavailable right now.' : 'Loading local weather…')}</span>}<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">{t('Weather by Open-Meteo')}</a></div>
    <button className="feature-text-button" type="button" onClick={onClear}>{t('Clear location')}</button>
  </aside>
}
