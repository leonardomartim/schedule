import type { ReactNode } from 'react'
import { ArrowUpRight, Bookmark, CalendarDays, MapPin, Plus, Sparkles } from 'lucide-react'
import type { EventPreferences } from '../account/account-validation'
import { safeEventUrl, type DiscoveredEvent } from './event-discovery'

interface EventCardProps { event: DiscoveredEvent; preferences: EventPreferences; saved: boolean; inAgenda: boolean; onToggleSaved: () => void; onAddToAgenda?: () => void }

function formatEventPrice(event: DiscoveredEvent): string {
  if (event.price === null) return 'Price not listed'
  if (event.price === 0) return 'Free'
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: event.currency }).format(event.price) }
  catch { return `${event.price} ${event.currency}` }
}

export function EventCard({ event, preferences, saved, inAgenda, onToggleSaved, onAddToAgenda }: EventCardProps): ReactNode {
  const url = safeEventUrl(event.url)
  const date = new Date(event.startsAt)
  const directionsUrl = `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`
  return <article className={`event-card event-category-${event.category}`}>
    <div className="event-card-banner"><span className="event-date"><strong>{date.toLocaleDateString(undefined, { day: 'numeric' })}</strong>{date.toLocaleDateString(undefined, { month: 'short' })}</span><span className="event-category">{event.category}</span><CalendarDays className="event-banner-icon" size={92} strokeWidth={0.8} /></div>
    <div className="event-card-content">{preferences.interests.includes(event.category) && <span className="event-match"><Sparkles size={12} /> Matches your interests</span>}<h3>{event.title}</h3><p className="event-card-description">{event.description}</p><time dateTime={event.startsAt}>{date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</time><p className="event-venue"><MapPin size={14} />{event.venue} · {event.city}{event.distanceKm !== undefined && ` · ${event.distanceKm.toFixed(1)} km`}</p><div className="event-card-footer"><strong>{formatEventPrice(event)}</strong>{url && <a href={url} target="_blank" rel="noopener noreferrer">Event details <ArrowUpRight size={15} /></a>}</div>
      <div className="event-card-actions"><button className="feature-text-button" aria-pressed={saved} aria-label={`${saved ? 'Unsave' : 'Save'} ${event.title}`} onClick={onToggleSaved}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save'}</button>{onAddToAgenda && <button className="feature-text-button" disabled={inAgenda} aria-label={`${inAgenda ? 'Added' : 'Add'} ${event.title} to agenda`} onClick={onAddToAgenda}><Plus size={15} />{inAgenda ? 'In agenda' : 'Add to agenda'}</button>}<a className="feature-text-button" href={directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${event.venue} on map`}>Map <ArrowUpRight size={13} /></a></div>
    </div>
  </article>
}
