import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Bookmark, Compass, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react'
import { accountErrorMessage, eventInterests, type EventPreferences } from '../account/account-validation'
import { supabase } from '../account/supabase-client'
import { usePresentation } from '../presentation/PresentationProvider'
import { distanceInKm, rankUpcomingEvents, validateEventSearch, type Coordinates, type DiscoveredEvent, type EventSearch } from './event-discovery'
import { defaultEventFilters, filterEventResults, validateEventFilters, type EventFilters } from './event-filters'
import { requestDeviceLocation, searchCatalogEvents } from './event-service'
import { searchPublicCities, type PublicCity } from './public-location-service'
import { loadSavedEvents, saveSavedEvents, toggleSavedEvent } from './saved-events'
import { filterFeaturedEvents, loadFeaturedEvents, loadSearchCity, rememberSearchCity } from './featured-events'
import { EventCard } from './EventCard'
import { EventSearchPanel } from './EventSearchPanel'
import { LocationSummary } from './LocationSummary'
import './event-experience.css'

interface EventsViewProps { preferences: EventPreferences; onEditPreferences?: () => void; userId?: string; onAddToAgenda?: (event: DiscoveredEvent) => void; agendaEventIds?: string[]; publicMode?: boolean; onRequestSignIn?: () => void }
export function EventsView({ preferences, onEditPreferences, userId, onAddToAgenda, agendaEventIds = [], publicMode = false, onRequestSignIn }: EventsViewProps): ReactNode {
  const { t, language } = usePresentation()
  const [city, setCity] = useState(loadSearchCity)
  const [query, setQuery] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>()
  const [cityPreview, setCityPreview] = useState<PublicCity | null>(null)
  const [locationLabel, setLocationLabel] = useState('Your current location')
  const [radiusKm, setRadiusKm] = useState(preferences.radiusKm)
  const [filters, setFilters] = useState<EventFilters>({ ...defaultEventFilters })
  const [events, setEvents] = useState<DiscoveredEvent[]>([])
  const [savedEvents, setSavedEvents] = useState<DiscoveredEvent[]>(() => userId ? loadSavedEvents(userId) : [])
  const [savedOnly, setSavedOnly] = useState(false)
  const [busy, setBusy] = useState(true)
  const [locating, setLocating] = useState(false)
  const [cityBusy, setCityBusy] = useState(false)
  const [cities, setCities] = useState<PublicCity[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searched, setSearched] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const requestVersion = useRef(0)
  const cityRequest = useRef<AbortController | null>(null)
  const featuredEvents = useRef<DiscoveredEvent[]>([])
  const committedSearch = useRef<EventSearch>({ city, query: '', radiusKm: preferences.radiusKm })
  useEffect(() => {
    const controller = new AbortController()
    const version = ++requestVersion.current
    setBusy(true); setError('')
    void loadFeaturedEvents(controller.signal).then((results) => {
      if (controller.signal.aborted) return
      featuredEvents.current = results
      setEvents((current) => [...current.filter((event) => !event.source), ...filterFeaturedEvents(results, committedSearch.current)])
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(accountErrorMessage(failure)) }).finally(() => { if (!controller.signal.aborted && requestVersion.current === version) setBusy(false) })
    return () => { controller.abort(); requestVersion.current += 1; cityRequest.current?.abort() }
  }, [refresh, preferences.radiusKm])

  const visibleEvents = useMemo(() => {
    const source = savedOnly ? rankUpcomingEvents(savedEvents, preferences).map((event) => ({ ...event, distanceKm: coordinates && event.latitude !== null && event.longitude !== null ? distanceInKm(coordinates, { latitude: event.latitude, longitude: event.longitude }) : undefined })) : events
    if (validateEventFilters(filters)) return []
    return filterEventResults(source, filters, preferences).filter((event) => !query.trim() || `${event.title} ${event.description} ${event.venue} ${t(event.category)}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))
  }, [savedOnly, savedEvents, preferences, coordinates, events, filters, query, t])
  const keywordSuggestions = [...new Set([...eventInterests.map((interest) => t(interest)), ...events.map((event) => event.title)])].slice(0, 20)
  function resetResults(): void { requestVersion.current += 1; cityRequest.current?.abort(); setError(''); setBusy(false); setLocating(false); setCityBusy(false); setCities(null) }
  async function search(searchInput: EventSearch, activeFilters = filters): Promise<void> {
    const version = ++requestVersion.current
    setBusy(true); setError(''); setSavedOnly(false)
    try {
      const validation = validateEventFilters(activeFilters) || ((searchInput.city.trim() || searchInput.coordinates) ? validateEventSearch(searchInput) : null)
      if (validation) throw new Error(validation)
      committedSearch.current = { ...searchInput, query: '' }
      let catalog: DiscoveredEvent[] = []
      if (!publicMode && (searchInput.city.trim() || searchInput.coordinates)) {
        if (!supabase) throw new Error('Event search is not connected yet. Please contact the site owner.')
        catalog = await searchCatalogEvents(supabase, { ...searchInput, filters: activeFilters }, preferences)
      }
      const combined = [...catalog, ...filterFeaturedEvents(featuredEvents.current, committedSearch.current)]
      if (requestVersion.current === version) {
        setEvents([...new Map(combined.map((event) => [event.id, event])).values()]); setSearched(true)
        if (!searchInput.coordinates) rememberSearchCity(searchInput.city)
      }
    } catch (failure) { if (requestVersion.current === version) setError(accountErrorMessage(failure)) }
    finally { if (requestVersion.current === version) setBusy(false) }
  }
  async function useLocation(): Promise<void> {
    resetResults(); const version = requestVersion.current; setLocating(true)
    try {
      const location = await requestDeviceLocation()
      if (requestVersion.current !== version) return
      setCoordinates(location); setCityPreview(null); setCity(''); setLocationLabel('Your current location'); setLocating(false)
      await search({ coordinates: location, city: '', query, radiusKm })
    } catch (failure) { if (requestVersion.current === version) { setError(accountErrorMessage(failure)); setLocating(false) } }
  }
  async function findCity(): Promise<void> {
    resetResults()
    if (city.trim().length < 2) { setError('Enter a city with at least two characters.'); return }
    const version = requestVersion.current; const controller = new AbortController()
    cityRequest.current = controller; setCityBusy(true)
    try { const results = await searchPublicCities(city, controller.signal, language === 'pt-BR' ? 'pt' : 'en'); if (requestVersion.current === version) setCities(results) }
    catch (failure) { if (requestVersion.current === version) setError(accountErrorMessage(failure)) }
    finally { if (requestVersion.current === version) setCityBusy(false) }
  }
  function selectMapCity(selected: PublicCity): void {
    resetResults(); const location: Coordinates = { latitude: selected.latitude, longitude: selected.longitude }
    setCoordinates(location); setCityPreview(null); setLocationLabel(selected.label)
    void search({ coordinates: location, city, query, radiusKm })
  }
  function selectSuggestedCity(selected: PublicCity): void {
    resetResults(); const name = selected.name ?? selected.label.split(',')[0]
    setCoordinates(undefined); setCity(name); setCityPreview(selected)
    void search({ city: name, query, radiusKm })
  }
  function changeFilters(next: EventFilters): void {
    resetResults(); setFilters(next)
    if (!publicMode && !savedOnly && searched && (city.trim() || coordinates)) void search({ city, query, coordinates, radiusKm }, next)
  }
  function clearLocation(): void { resetResults(); setCoordinates(undefined); setCityPreview(null); setFilters((current) => ({ ...current, sort: current.sort === 'nearest' ? 'recommended' : current.sort })) }
  function saveEvent(event: DiscoveredEvent): void {
    if (publicMode) { onRequestSignIn?.(); return }
    const next = toggleSavedEvent(savedEvents, event); setSavedEvents(next)
    setNotice(userId && !saveSavedEvents(userId, next) ? 'Saved for this session. Browser storage is unavailable.' : '')
  }
  function submit(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); void search({ city, query, coordinates, radiusKm }) }
  return <section className={`events-page ${publicMode ? 'public-events-page' : ''}`}>
    {!publicMode && <><div className="events-heading"><div><span className="feature-kicker">{t('Good things, closer to home')}</span><h1>{t('Out there.')} <em>{t('For you.')}</em></h1><p className="feature-subtitle">{t('Discover your next plan, just around the corner.')}</p></div>{onEditPreferences && <button className="feature-button secondary" onClick={onEditPreferences}><SlidersHorizontal size={16} />{t('Your preferences')}</button>}</div><div className="event-preference-summary"><Sparkles size={15} /><span>{t('Picked for your interests:')}</span>{preferences.interests.map((interest) => <span className="interest-tag" key={interest}>{t(interest)}</span>)}<span className="budget-summary">{t(preferences.budget === 'free' ? 'Free events first' : preferences.budget === 'paid' ? 'Paid experiences first' : 'All budgets welcome')}</span></div></>}
    <EventSearchPanel city={city} query={query} radiusKm={radiusKm} hasCoordinates={Boolean(coordinates)} filters={filters} busy={busy} locating={locating} cityBusy={cityBusy} publicMode={publicMode} cities={cities} keywordSuggestions={keywordSuggestions} onSubmit={submit} onQueryChange={(value) => { resetResults(); setQuery(value) }} onCityChange={(value) => { clearLocation(); setCity(value) }} onCitySelect={selectSuggestedCity} onMapCitySelect={selectMapCity} onRadiusChange={(value) => { resetResults(); setRadiusKm(value) }} onFiltersChange={changeFilters} onClearFilters={() => changeFilters({ ...defaultEventFilters })} onUseLocation={() => void useLocation()} onFindCity={() => void findCity()} />
    {(coordinates || cityPreview) && <LocationSummary coordinates={coordinates ?? cityPreview!} label={cityPreview?.label ?? t(locationLabel)} radiusKm={coordinates ? radiusKm : undefined} onClear={clearLocation} />}
    {error && <div className="event-load-error"><p role="alert" className="feature-error">{t(error)}</p><button className="feature-button secondary" onClick={() => { setRefresh((value) => value + 1) }}>{t('Try again')}</button></div>}{notice && <p role="status" className="feature-notice">{t(notice)}</p>}
    <div className="event-results-heading"><div className="event-result-tabs"><button aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>{t('Upcoming events')}</button>{!publicMode && <button aria-pressed={savedOnly} onClick={() => { resetResults(); setSavedOnly(true) }}><Bookmark size={14} />{t('Saved events')} ({savedEvents.length})</button>}</div><span aria-live="polite">{t('{count} found', { count: visibleEvents.length })}</span></div>
    {events.some((event) => event.source) && !savedOnly && <p className="event-source-note">{t('Public events currently cover São Paulo, from the official SP Mais Cultura agenda.')}</p>}
    {(busy || locating || cityBusy) && <div className="event-loading" role="status"><Compass size={20} className="search-pulse" /><span>{t(locating ? 'Finding your neighborhood…' : cityBusy ? 'Finding your city…' : 'Loading upcoming events…')}</span></div>}
    {visibleEvents.length === 0 && !busy && !locating && !cityBusy && !error && <div className="event-empty" role="status"><span><MapPin size={30} /></span><h3>{t(savedOnly ? 'No saved events match these filters.' : searched ? 'No upcoming events found.' : 'No events match your search.')}</h3><p>{t(savedOnly ? 'Save an event or clear your filters to see more plans.' : 'Clear the keyword or filters to explore more events.')}</p><button className="feature-button secondary" onClick={() => { resetResults(); setQuery(''); setCity(''); setCoordinates(undefined); setCityPreview(null); setFilters({ ...defaultEventFilters }); setEvents(featuredEvents.current); committedSearch.current = { city: '', query: '', radiusKm }; setSavedOnly(false); rememberSearchCity('') }}>{t('Search all events')}</button></div>}
    {visibleEvents.length > 0 && <div className="event-grid" aria-busy={busy}>{visibleEvents.map((event) => <EventCard key={event.id} event={event} preferences={preferences} saved={savedEvents.some((saved) => saved.id === event.id)} inAgenda={agendaEventIds.includes(event.id)} onToggleSaved={() => saveEvent(event)} onAddToAgenda={publicMode ? undefined : onAddToAgenda ? () => onAddToAgenda(event) : undefined} />)}</div>}
    {!savedOnly && events.length === 100 && <p className="feature-subtitle">{t('Showing up to 100 matches. Narrow your keyword, dates or distance for more specific results.')}</p>}
  </section>
}
