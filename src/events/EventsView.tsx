import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Bookmark, Compass, LocateFixed, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { accountErrorMessage, type EventPreferences } from '../account/account-validation'
import { supabase } from '../account/supabase-client'
import { distanceInKm, rankUpcomingEvents, validateEventSearch, type Coordinates, type DiscoveredEvent, type EventSearch } from './event-discovery'
import { defaultEventFilters, filterEventResults, validateEventFilters, type EventFilters } from './event-filters'
import { requestDeviceLocation, searchCatalogEvents } from './event-service'
import { searchPublicCities, type PublicCity } from './public-location-service'
import { loadSavedEvents, saveSavedEvents, toggleSavedEvent } from './saved-events'
import { EventCard } from './EventCard'
import { EventFilterControls } from './EventFilterControls'
import { LocationSummary } from './LocationSummary'
import './event-experience.css'

interface EventsViewProps { preferences: EventPreferences; onEditPreferences: () => void; userId?: string; onAddToAgenda?: (event: DiscoveredEvent) => void; agendaEventIds?: string[] }

export function EventsView({ preferences, onEditPreferences, userId, onAddToAgenda, agendaEventIds = [] }: EventsViewProps): ReactNode {
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>()
  const [locationLabel, setLocationLabel] = useState('Your current location')
  const [radiusKm, setRadiusKm] = useState(preferences.radiusKm)
  const [filters, setFilters] = useState<EventFilters>({ ...defaultEventFilters })
  const [events, setEvents] = useState<DiscoveredEvent[] | null>(null)
  const [savedEvents, setSavedEvents] = useState<DiscoveredEvent[]>(() => userId ? loadSavedEvents(userId) : [])
  const [savedOnly, setSavedOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [cityBusy, setCityBusy] = useState(false)
  const [cities, setCities] = useState<PublicCity[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestVersion = useRef(0)
  const cityRequest = useRef<AbortController | null>(null)

  useEffect(() => () => { requestVersion.current += 1; cityRequest.current?.abort() }, [])

  const visibleEvents = useMemo(() => {
    const source = savedOnly ? rankUpcomingEvents(savedEvents, preferences).map((event) => ({ ...event,
      distanceKm: coordinates ? distanceInKm(coordinates, event) : undefined,
    })) : events
    if (!source || validateEventFilters(filters)) return []
    return filterEventResults(source, filters, preferences).filter((event) => !savedOnly || `${event.title} ${event.description} ${event.venue}`.toLowerCase().includes(query.trim().toLowerCase()))
  }, [savedOnly, savedEvents, preferences, coordinates, events, filters, query])

  function resetResults(): void {
    requestVersion.current += 1; cityRequest.current?.abort()
    setEvents(null); setError(''); setBusy(false); setLocating(false); setCityBusy(false); setCities(null)
  }

  async function search(searchInput: EventSearch): Promise<void> {
    const version = ++requestVersion.current
    setBusy(true); setEvents(null); setError(''); setSavedOnly(false)
    try {
      const validation = validateEventSearch(searchInput) || validateEventFilters(filters)
      if (validation) throw new Error(validation)
      if (!supabase) throw new Error('Event search is not connected yet. Please contact the site owner.')
      const results = await searchCatalogEvents(supabase, { ...searchInput, filters }, preferences)
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
      setCoordinates(location); setCity(''); setLocationLabel('Your current location'); setLocating(false)
      await search({ coordinates: location, city: '', query, radiusKm })
    } catch (failure) {
      if (requestVersion.current === version) { setError(accountErrorMessage(failure)); setLocating(false) }
    }
  }

  async function findCity(): Promise<void> {
    resetResults()
    if (city.trim().length < 2) { setError('Enter a city with at least two characters.'); return }
    const version = requestVersion.current
    const controller = new AbortController()
    cityRequest.current = controller; setCityBusy(true)
    try {
      const results = await searchPublicCities(city, controller.signal)
      if (requestVersion.current === version) setCities(results)
    } catch (failure) { if (requestVersion.current === version) setError(accountErrorMessage(failure)) }
    finally { if (requestVersion.current === version) setCityBusy(false) }
  }

  function selectCity(selected: PublicCity): void {
    resetResults()
    const location: Coordinates = { latitude: selected.latitude, longitude: selected.longitude }
    setCoordinates(location); setLocationLabel(selected.label)
    void search({ coordinates: location, city, query, radiusKm })
  }

  function changeFilters(next: EventFilters): void { resetResults(); setFilters(next) }
  function clearLocation(): void { resetResults(); setCoordinates(undefined); setFilters((current) => ({ ...current, sort: current.sort === 'nearest' ? 'recommended' : current.sort })) }
  function saveEvent(event: DiscoveredEvent): void {
    const next = toggleSavedEvent(savedEvents, event)
    setSavedEvents(next)
    setNotice(userId && !saveSavedEvents(userId, next) ? 'Saved for this session. Browser storage is unavailable.' : '')
  }
  function showSavedEvents(): void {
    const lastResults = events
    resetResults(); setEvents(lastResults); setSavedOnly(true)
  }
  function submit(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); void search({ city, query, coordinates, radiusKm }) }

  return <section className="events-page">
    <div className="events-heading"><div><span className="feature-kicker">Good things, closer to home</span><h1>Out there. <em>For you.</em></h1><p className="feature-subtitle">Discover your next plan, just around the corner.</p></div><button className="feature-button secondary" onClick={onEditPreferences}><SlidersHorizontal size={16} /> Your preferences</button></div>
    <div className="event-preference-summary"><Sparkles size={15} /><span>Picked for your interests:</span>{preferences.interests.map((interest) => <span className="interest-tag" key={interest}>{interest}</span>)}<span className="budget-summary">{preferences.budget === 'free' ? 'Free events first' : preferences.budget === 'paid' ? 'Paid experiences first' : 'All budgets welcome'}</span></div>
    <form className="event-search-panel feature-form" onSubmit={submit}>
      <div className="event-search-fields"><label>Event or keyword<div className="input-with-icon"><Search size={17} /><input maxLength={120} value={query} placeholder="Music, art, a little adventure…" onChange={(event) => { resetResults(); setQuery(event.target.value) }} /></div></label><label>City<div className="input-with-icon"><MapPin size={17} /><input maxLength={120} value={city} placeholder={coordinates ? 'Using selected location' : 'e.g. São Paulo'} onChange={(event) => { clearLocation(); setCity(event.target.value) }} /></div></label><label>Distance<select value={radiusKm} disabled={!coordinates} onChange={(event) => { resetResults(); setRadiusKm(Number(event.target.value)) }}>{[5, 10, 25, 50, 100].map((distance) => <option key={distance} value={distance}>{distance} km</option>)}</select></label><button className="feature-button" disabled={busy || locating || cityBusy} type="submit"><Search size={17} />{busy ? 'Searching…' : 'Find events'}</button></div>
      <EventFilterControls filters={filters} hasCoordinates={Boolean(coordinates)} onChange={changeFilters} onClear={() => changeFilters({ ...defaultEventFilters })} />
      <div className="event-location-row"><button className="feature-text-button" disabled={busy || locating || cityBusy} type="button" onClick={() => void useLocation()}><LocateFixed size={15} />{locating ? 'Finding your location…' : 'Use my location'}</button><button className="feature-text-button" disabled={busy || locating || cityBusy} type="button" onClick={() => void findCity()}><MapPin size={15} />{cityBusy ? 'Finding cities…' : 'Find city on map'}</button><p>Use GPS or choose a city to search by distance. Location is requested only when you choose.</p></div>
      {cities && <div className="city-options" aria-live="polite">{cities.length === 0 ? <p>No matching cities. Try a city and country, or search the catalog directly.</p> : <><p>Choose your city to search nearby:</p>{cities.map((result) => <button className="feature-button secondary" type="button" key={result.id} onClick={() => selectCity(result)}>{result.label}</button>)}</>}<small>City data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> / GeoNames</small></div>}
    </form>
    {coordinates && <LocationSummary coordinates={coordinates} label={locationLabel} radiusKm={radiusKm} onClear={clearLocation} />}
    {error && <p role="alert" className="feature-error">{error}</p>}
    {notice && <p role="status" className="feature-notice">{notice}</p>}
    <div className="event-results-heading"><div className="event-result-tabs"><button aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>Upcoming events</button><button aria-pressed={savedOnly} onClick={showSavedEvents}><Bookmark size={14} />Saved events ({savedEvents.length})</button></div><span aria-live="polite">{savedOnly || events ? `${visibleEvents.length} found` : 'A new plan starts here'}</span></div>
    {(busy || locating || cityBusy) && <div className="event-empty" role="status"><span className="search-pulse"><Compass size={30} /></span><h3>{locating ? 'Finding your neighborhood…' : cityBusy ? 'Finding your city…' : 'Looking for your next plan…'}</h3></div>}
    {!busy && !locating && !cityBusy && !savedOnly && events === null && !error && <div className="event-empty"><span><Compass size={32} /></span><h3>There’s a world outside your routine.</h3><p>Enter a city or share your location to find upcoming events from our local catalog.</p><small>Your saved events are always available on this device.</small></div>}
    {(savedOnly || events !== null) && visibleEvents.length === 0 && !busy && <div className="event-empty" role="status"><span><MapPin size={30} /></span><h3>{savedOnly ? 'No saved events match these filters.' : 'No upcoming events found.'}</h3><p>{savedOnly ? 'Save an event or clear your filters to see more plans.' : 'Try another city, a wider radius, or fewer filters. New events appear when they’re added to the catalog.'}</p></div>}
    {visibleEvents.length > 0 && <div className="event-grid">{visibleEvents.map((event) => <EventCard key={event.id} event={event} preferences={preferences} saved={savedEvents.some((saved) => saved.id === event.id)} inAgenda={agendaEventIds.includes(event.id)} onToggleSaved={() => saveEvent(event)} onAddToAgenda={onAddToAgenda ? () => onAddToAgenda(event) : undefined} />)}</div>}
    {!savedOnly && events?.length === 100 && <p className="feature-subtitle">Showing up to 100 matches. Narrow your keyword, dates or distance for more specific results.</p>}
  </section>
}
