import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Bookmark, Compass, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react'
import { accountErrorMessage, eventInterests, type EventPreferences } from '../account/account-validation'
import { usePresentation } from '../presentation/PresentationProvider'
import { distanceInKm, rankUpcomingEvents, validateEventSearch, type Coordinates, type DiscoveredEvent, type EventSearch } from './event-discovery'
import { defaultEventFilters, filterEventResults, validateEventFilters, type EventFilters } from './event-filters'
import { requestDeviceLocation } from './event-service'
import { searchPublicCities, type PublicCity } from './public-location-service'
import { loadSavedEvents, saveSavedEvents, toggleSavedEvent } from './saved-events'
import { loadSearchCity } from './search-location-storage'
import { useEventResults } from './useEventResults'
import { eventCountryName } from './event-country-names'
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
  const [savedEvents, setSavedEvents] = useState<DiscoveredEvent[]>(() => userId ? loadSavedEvents(userId) : [])
  const [savedOnly, setSavedOnly] = useState(false)
  const [locating, setLocating] = useState(false)
  const [cityBusy, setCityBusy] = useState(false)
  const [cities, setCities] = useState<PublicCity[] | null>(null)
  const [notice, setNotice] = useState('')
  const results = useEventResults(preferences, publicMode)
  const { events, publicPage, busy, error, setError, searched, committedQuery } = results
  const requestVersion = useRef(0)
  const cityRequest = useRef<AbortController | null>(null)
  useEffect(() => () => { requestVersion.current += 1; cityRequest.current?.abort() }, [])

  const visibleEvents = useMemo(() => {
    const source = savedOnly ? rankUpcomingEvents(savedEvents, preferences).map((event) => ({ ...event, distanceKm: coordinates && event.latitude !== null && event.longitude !== null ? distanceInKm(coordinates, { latitude: event.latitude, longitude: event.longitude }) : undefined })) : events
    if (validateEventFilters(filters)) return []
    return filterEventResults(source, filters, preferences).filter((event) => (!savedOnly && query === committedQuery) || !query.trim() || `${event.title} ${event.description} ${event.venue} ${t(event.category)}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))
  }, [savedOnly, savedEvents, preferences, coordinates, events, filters, query, committedQuery, t])
  const keywordSuggestions = [...new Set([...eventInterests.map((interest) => t(interest)), ...events.map((event) => event.title)])].slice(0, 20)
  const resultLocation = publicPage?.location
  const resultLocationLabel = resultLocation?.countryCode ? `${resultLocation.kind === 'city' ? `${resultLocation.city}, ` : ''}${eventCountryName(resultLocation.countryCode, language)}` : t(resultLocation?.label ?? '')
  function resetResults(): void { requestVersion.current += 1; cityRequest.current?.abort(); results.cancelSearch(); setLocating(false); setCityBusy(false); setCities(null) }
  async function search(searchInput: EventSearch, activeFilters = filters): Promise<void> {
    requestVersion.current += 1; setError(''); setSavedOnly(false)
    try {
      const validation = validateEventFilters(activeFilters) || ((searchInput.city.trim() || searchInput.coordinates) ? validateEventSearch(searchInput) : null)
      if (validation) throw new Error(validation)
      await results.search({ ...searchInput, filters: activeFilters })
    } catch (failure: unknown) { setError(accountErrorMessage(failure)) }
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
    void search({ city: name, query, radiusKm, countryCode: selected.countryCode })
  }
  function changeFilters(next: EventFilters): void {
    resetResults(); setFilters(next)
    if (!savedOnly && searched) void search({ city, query, coordinates, radiusKm, countryCode: cityPreview?.countryCode }, next)
  }
  function clearLocation(): void { resetResults(); setCoordinates(undefined); setCityPreview(null); setFilters((current) => ({ ...current, sort: current.sort === 'nearest' ? 'recommended' : current.sort })) }
  function saveEvent(event: DiscoveredEvent): void {
    if (publicMode) { onRequestSignIn?.(); return }
    const next = toggleSavedEvent(savedEvents, event); setSavedEvents(next)
    setNotice(userId && !saveSavedEvents(userId, next) ? 'Saved for this session. Browser storage is unavailable.' : '')
  }
  function submit(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); void search({ city, query, coordinates, radiusKm, countryCode: cityPreview?.countryCode }) }
  return <section className={`events-page ${publicMode ? 'public-events-page' : ''}`}>
    {!publicMode && <><div className="events-heading"><div><span className="feature-kicker">{t('Good things, closer to home')}</span><h1>{t('Out there.')} <em>{t('For you.')}</em></h1><p className="feature-subtitle">{t('Discover your next plan, just around the corner.')}</p></div>{onEditPreferences && <button className="feature-button secondary" onClick={onEditPreferences}><SlidersHorizontal size={16} />{t('Your preferences')}</button>}</div><div className="event-preference-summary"><Sparkles size={15} /><span>{t('Picked for your interests:')}</span>{preferences.interests.map((interest) => <span className="interest-tag" key={interest}>{t(interest)}</span>)}<span className="budget-summary">{t(preferences.budget === 'free' ? 'Free events first' : preferences.budget === 'paid' ? 'Paid experiences first' : 'All budgets welcome')}</span></div></>}
    <EventSearchPanel city={city} query={query} radiusKm={radiusKm} hasCoordinates={Boolean(coordinates)} filters={filters} busy={busy} locating={locating} cityBusy={cityBusy} publicMode={publicMode} cities={cities} keywordSuggestions={keywordSuggestions} onSubmit={submit} onQueryChange={(value) => { resetResults(); setQuery(value) }} onCityChange={(value) => { clearLocation(); setCity(value) }} onCitySelect={selectSuggestedCity} onMapCitySelect={selectMapCity} onRadiusChange={(value) => { resetResults(); setRadiusKm(value) }} onFiltersChange={changeFilters} onClearFilters={() => changeFilters({ ...defaultEventFilters })} onUseLocation={() => void useLocation()} onFindCity={() => void findCity()} />
    {(coordinates || cityPreview) && <LocationSummary coordinates={coordinates ?? cityPreview!} label={cityPreview?.label ?? t(locationLabel)} radiusKm={coordinates ? radiusKm : undefined} onClear={clearLocation} />}
    {error && <div className="event-load-error"><p role="alert" className="feature-error">{t(error)}</p><button className="feature-button secondary" onClick={() => void results.retry()}>{t('Try again')}</button></div>}{notice && <p role="status" className="feature-notice">{t(notice)}</p>}
    <div className="event-results-heading"><div className="event-result-tabs"><button aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>{t('Upcoming events')}</button>{!publicMode && <button aria-pressed={savedOnly} onClick={() => { resetResults(); setSavedOnly(true) }}><Bookmark size={14} />{t('Saved events')} ({savedEvents.length})</button>}</div><span aria-live="polite">{t('{count} found', { count: visibleEvents.length })}</span></div>
    {!savedOnly && publicPage && <div className="event-source-note"><strong>{t('Results for {location}', { location: resultLocationLabel })}</strong><p>{t('Available sources: {sources}', { sources: [...new Set(publicPage.sources.filter((source) => source.status === 'ok').map((source) => source.name))].join(', ') || [...new Set(events.flatMap((event) => event.source ? [event.source] : []))].join(', ') })}</p></div>}
    {!savedOnly && (results.catalogWarning || publicPage?.sources.some((source) => source.status === 'unavailable')) && <p role="status" className="feature-notice">{t('Some sources are unavailable. These results may be incomplete.')}</p>}
    {(busy || locating || cityBusy) && <div className="event-loading" role="status"><Compass size={20} className="search-pulse" /><span>{t(locating ? 'Finding your neighborhood…' : cityBusy ? 'Finding your city…' : 'Loading upcoming events…')}</span></div>}
    {visibleEvents.length === 0 && !busy && !locating && !cityBusy && !error && <div className="event-empty" role="status"><span><MapPin size={30} /></span><h3>{t(savedOnly ? 'No saved events match these filters.' : searched ? 'No upcoming events found.' : 'No events match your search.')}</h3><p>{t(savedOnly ? 'Save an event or clear your filters to see more plans.' : 'Coverage depends on local listings. Try another city, country or fewer filters.')}</p><button className="feature-button secondary" onClick={() => { resetResults(); setQuery(''); setCity(''); setCoordinates(undefined); setCityPreview(null); setFilters({ ...defaultEventFilters }); setSavedOnly(false); void results.resetSearch(radiusKm) }}>{t('Search all events')}</button></div>}
    {visibleEvents.length > 0 && <div className="event-grid" aria-busy={busy}>{visibleEvents.map((event) => <EventCard key={event.id} event={event} preferences={preferences} saved={savedEvents.some((saved) => saved.id === event.id)} inAgenda={agendaEventIds.includes(event.id)} onToggleSaved={() => saveEvent(event)} onAddToAgenda={publicMode ? undefined : onAddToAgenda ? () => onAddToAgenda(event) : undefined} />)}</div>}
    {!savedOnly && publicPage?.hasMore && <button className="feature-button secondary event-load-more" disabled={busy} onClick={() => void results.loadMore()}>{t(busy ? 'Searching…' : 'Load more events')}</button>}
  </section>
}
