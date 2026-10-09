import type { ReactNode } from 'react'
import { ArrowUpRight, Bookmark, CalendarDays, MapPin, Plus, Sparkles } from 'lucide-react'
import type { EventPreferences } from '../account/account-validation'
import { usePresentation } from '../presentation/PresentationProvider'
import { safeEventUrl, type DiscoveredEvent } from './event-discovery'

interface EventCardProps { event: DiscoveredEvent; preferences: EventPreferences; saved: boolean; inAgenda: boolean; onToggleSaved: () => void; onAddToAgenda?: () => void }
function formatEventPrice(event: DiscoveredEvent, locale: string, t: (message: string) => string): string {
  if (event.price === null) return t('Price not listed')
  if (event.price === 0) return t('Free')
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: event.currency }).format(event.price) }
  catch { return `${event.price} ${event.currency}` }
}
export function EventCard({ event, preferences, saved, inAgenda, onToggleSaved, onAddToAgenda }: EventCardProps): ReactNode {
  const { t, locale } = usePresentation()
  const url = safeEventUrl(event.url)
  const date = new Date(event.startsAt)
  const directionsUrl = event.latitude !== null && event.longitude !== null ? `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${event.venue}, ${event.city}`)}`
  return <article className={`event-card event-category-${event.category}`}>
    <div className="event-card-banner"><span className="event-date"><strong>{date.toLocaleDateString(locale, { day: 'numeric' })}</strong>{date.toLocaleDateString(locale, { month: 'short' })}</span><span className="event-category">{t(event.category)}</span><CalendarDays className="event-banner-icon" size={92} strokeWidth={0.8} aria-hidden="true" /></div>
    <div className="event-card-content">
      {preferences.interests.includes(event.category) && <span className="event-match"><Sparkles size={12} />{t('Matches your interests')}</span>}
      <h3>{event.title}</h3><p className="event-card-description">{event.description}</p>
      <time dateTime={event.startsAt}>{date.toLocaleString(locale, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</time>
      <p className="event-venue"><MapPin size={14} />{event.venue} · {event.city}{event.distanceKm !== undefined && ` · ${event.distanceKm.toLocaleString(locale, { maximumFractionDigits: 1 })} km`}</p>
      {event.source && <p className="event-card-source">{t('Source: {source}', { source: event.source })}</p>}
      <div className="event-card-footer"><strong>{formatEventPrice(event, locale, t)}</strong>{url && <a href={url} target="_blank" rel="noopener noreferrer">{t(event.source ? 'Official agenda' : 'Event details')}<ArrowUpRight size={15} /></a>}</div>
      <div className="event-card-actions">
        <button className="feature-text-button" aria-pressed={saved} aria-label={t(saved ? 'Unsave {title}' : 'Save {title}', { title: event.title })} onClick={onToggleSaved}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />{t(saved ? 'Saved' : 'Save')}</button>
        {onAddToAgenda && <button className="feature-text-button" disabled={inAgenda} aria-label={t(inAgenda ? 'Added {title} to agenda' : 'Add {title} to agenda', { title: event.title })} onClick={onAddToAgenda}><Plus size={15} />{t(inAgenda ? 'In agenda' : 'Add to agenda')}</button>}
        <a className="feature-text-button" href={directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={t('View {venue} on map', { venue: event.venue })}>{t('Map')}<ArrowUpRight size={13} /></a>
      </div>
    </div>
  </article>
}
