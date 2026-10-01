import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUpRight, CalendarDays, Compass, LocateFixed, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { accountErrorMessage, type EventPreferences } from '../account/account-validation'
import { supabase } from '../account/supabase-client'
import { safeEventUrl, type Coordinates, type DiscoveredEvent, type EventSearch } from './event-discovery'
import { requestDeviceLocation, searchCatalogEvents } from './event-service'

interface EventsViewProps { preferences: EventPreferences; onEditPreferences: () => void }

export function EventsView({ preferences, onEditPreferences }: EventsViewProps): ReactNode {
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>()
  const [radiusKm, setRadiusKm] = useState(preferences.radiusKm)
  const [events, setEvents] = useState<DiscoveredEvent[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)

  useEffect(() => () => { requestVersion.current += 1 }, [])

  function resetResults(): void {
    requestVersion.current += 1
    setEvents(null); setError(''); setBusy(false); setLocating(false)
  }

  async function search(searchInput: EventSearch): Promise<void> {
    const version = ++requestVersion.current
    setBusy(true); setEvents(null); setError('')
    try {
      if (!supabase) throw new Error('Event search is not connected yet. Please contact the site owner.')
      const results = await searchCatalogEvents(supabase, searchInput, preferences)
      if (requestVersion.current === version) setEvents(results)
    } catch (failure) { if (requestVersion.current === version) setError(accountErrorMessage(failure)) }
    finally { if (requestVersion.current === version) setBusy(false) }
  }

  async function useLocation(): Promise<void> {
    resetResults()
    const version = requestVersion.current
    setLocating(true)
    try {
      const location = await requestDeviceLocation()
      if (requestVersion.current !== version) return
      setCoordinates(location); setCity(''); setLocating(false)
      await search({ coordinates: location, city: '', query, radiusKm })
    } catch (failure) {
      if (requestVersion.current === version) { setError(accountErrorMessage(failure)); setLocating(false) }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void search({ city, query, coordinates, radiusKm })
  }

  return <section className="events-page">
    <div className="events-heading"><div><span className="feature-kicker">Good things, closer to home</span><h1>Out there. <em>For you.</em></h1><p className="feature-subtitle">Discover your next plan, just around the corner.</p></div><button className="feature-button secondary" onClick={onEditPreferences}><SlidersHorizontal size={16} /> Your preferences</button></div>
    <div className="event-preference-summary"><Sparkles size={15} /><span>Picked for your interests:</span>{preferences.interests.map((interest) => <span className="interest-tag" key={interest}>{interest}</span>)}<span className="budget-summary">{preferences.budget === 'free' ? 'Free events first' : preferences.budget === 'paid' ? 'Paid experiences first' : 'All budgets welcome'}</span></div>
    <form className="event-search-panel feature-form" onSubmit={submit}>
      <div className="event-search-fields"><label>Event or keyword<div className="input-with-icon"><Search size={17} /><input maxLength={120} value={query} placeholder="Music, art, a little adventure…" onChange={(event) => { resetResults(); setQuery(event.target.value) }} /></div></label><label>City<div className="input-with-icon"><MapPin size={17} /><input maxLength={120} value={city} placeholder={coordinates ? 'Using your current location' : 'e.g. São Paulo'} onChange={(event) => { resetResults(); setCity(event.target.value); setCoordinates(undefined) }} /></div></label><label>Distance<select value={radiusKm} disabled={!coordinates} onChange={(event) => { resetResults(); setRadiusKm(Number(event.target.value)) }}>{[5, 10, 25, 50, 100].map((distance) => <option key={distance} value={distance}>{distance} km</option>)}</select></label><button className="feature-button" disabled={busy || locating} type="submit"><Search size={17} />{busy ? 'Searching…' : 'Find events'}</button></div>
      <div className="event-location-row"><button className="feature-text-button" disabled={busy || locating} type="button" onClick={() => void useLocation()}><LocateFixed size={15} />{locating ? 'Finding your location…' : 'Use my location'}</button><p>{coordinates ? `Searching within ${radiusKm} km. Your coordinates are used only for this search.` : 'Search a whole city, or use your location to search by distance.'}</p></div>
    </form>
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="event-results-heading"><h2>Upcoming events</h2><span>{events ? `${events.length}${events.length === 100 ? '+' : ''} found · Best matches first` : 'A new plan starts here'}</span></div>
    {(busy || locating) && <div className="event-empty" role="status"><span className="search-pulse"><Compass size={30} /></span><h3>{locating ? 'Finding your neighborhood…' : 'Looking for your next plan…'}</h3></div>}
    {!busy && !locating && events === null && !error && <div className="event-empty"><span><Compass size={32} /></span><h3>There’s a world outside your routine.</h3><p>Enter a city or share your location to find upcoming events from our local catalog.</p><small>Location is only requested when you choose to share it.</small></div>}
    {events?.length === 0 && <div className="event-empty" role="status"><span><MapPin size={30} /></span><h3>No upcoming events found.</h3><p>Try another city, a wider radius, or a different keyword. New events appear when they’re added to the catalog.</p></div>}
    {events && events.length > 0 && <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} preferences={preferences} />)}</div>}
    {events?.length === 100 && <p className="feature-subtitle">Showing the top 100 matches. Narrow your keyword or distance for more specific results.</p>}
  </section>
}

function EventCard({ event, preferences }: { event: DiscoveredEvent; preferences: EventPreferences }): ReactNode {
  const url = safeEventUrl(event.url)
  const date = new Date(event.startsAt)
  const price = event.price === null ? 'Price not listed' : event.price === 0 ? 'Free' : new Intl.NumberFormat(undefined, { style: 'currency', currency: event.currency }).format(event.price)
  return <article className={`event-card event-category-${event.category}`}>
    <div className="event-card-banner"><span className="event-date"><strong>{date.toLocaleDateString(undefined, { day: 'numeric' })}</strong>{date.toLocaleDateString(undefined, { month: 'short' })}</span><span className="event-category">{event.category}</span><CalendarDays className="event-banner-icon" size={92} strokeWidth={0.8} /></div>
    <div className="event-card-content">{preferences.interests.includes(event.category) && <span className="event-match"><Sparkles size={12} /> Matches your interests</span>}<h3>{event.title}</h3><p className="event-card-description">{event.description}</p><time dateTime={event.startsAt}>{date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</time><p className="event-venue"><MapPin size={14} />{event.venue} · {event.city}{event.distanceKm !== undefined && ` · ${event.distanceKm.toFixed(1)} km`}</p><div className="event-card-footer"><strong>{price}</strong>{url && <a href={url} target="_blank" rel="noopener noreferrer">Event details <ArrowUpRight size={15} /></a>}</div></div>
  </article>
}
