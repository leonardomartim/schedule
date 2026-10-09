import { useId, type FormEvent, type ReactNode } from 'react'
import { LocateFixed, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { eventInterests } from '../account/account-validation'
import { usePresentation } from '../presentation/PresentationProvider'
import type { EventFilters } from './event-filters'
import type { PublicCity } from './public-location-service'
import { CityAutocomplete } from './CityAutocomplete'
import { EventFilterControls } from './EventFilterControls'

interface EventSearchPanelProps {
  city: string; query: string; radiusKm: number; hasCoordinates: boolean; filters: EventFilters; busy: boolean; locating: boolean; cityBusy: boolean; publicMode: boolean
  keywordSuggestions: string[]; cities: PublicCity[] | null
  onCityChange: (city: string) => void; onCitySelect: (city: PublicCity) => void; onQueryChange: (query: string) => void; onRadiusChange: (radius: number) => void
  onFiltersChange: (filters: EventFilters) => void; onClearFilters: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUseLocation: () => void; onFindCity: () => void; onMapCitySelect: (city: PublicCity) => void
}
export function EventSearchPanel(props: EventSearchPanelProps): ReactNode {
  const { t } = usePresentation()
  const keywordsId = useId()
  const activeFilterCount = Number(props.filters.budget !== 'any') + Number(Boolean(props.filters.dateFrom)) + Number(Boolean(props.filters.dateTo))
  return <form className="event-search-panel feature-form" onSubmit={props.onSubmit}>
    <div className={`event-search-fields ${props.publicMode ? 'public-search-fields' : ''}`}>
      <label>{t('Event or keyword')}<div className="input-with-icon"><Search size={17} aria-hidden="true" /><input type="search" name="event-query" autoComplete="off" list={keywordsId} maxLength={120} value={props.query} placeholder={t('Music, art, a little adventure…')} onChange={(event) => props.onQueryChange(event.target.value)} /><datalist id={keywordsId}>{props.keywordSuggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist></div></label>
      <CityAutocomplete value={props.city} onChange={props.onCityChange} onSelect={props.onCitySelect} />
      {!props.publicMode && <label>{t('Distance')}<select value={props.radiusKm} disabled={!props.hasCoordinates} onChange={(event) => props.onRadiusChange(Number(event.target.value))}>{[5, 10, 25, 50, 100].map((distance) => <option key={distance} value={distance}>{distance} km</option>)}</select></label>}
      <button className="feature-button" disabled={props.busy || props.locating || props.cityBusy} type="submit"><Search size={17} />{t(props.busy ? 'Searching…' : 'Find events')}</button>
    </div>
    <div className="category-quick-filters" role="group" aria-label={t('Event categories')}><button type="button" aria-pressed={props.filters.category === 'all'} onClick={() => props.onFiltersChange({ ...props.filters, category: 'all' })}>{t('All categories')}</button>{eventInterests.map((category) => <button type="button" key={category} aria-pressed={props.filters.category === category} onClick={() => props.onFiltersChange({ ...props.filters, category })}>{t(category)}</button>)}</div>
    <details className="advanced-event-filters"><summary><SlidersHorizontal size={15} />{t('More filters')}{activeFilterCount > 0 && <span>{activeFilterCount}</span>}</summary><EventFilterControls filters={props.filters} hasCoordinates={props.hasCoordinates} onChange={props.onFiltersChange} onClear={props.onClearFilters} /></details>
    {!props.publicMode && <div className="event-location-row"><button className="feature-text-button" disabled={props.busy || props.locating || props.cityBusy} type="button" onClick={props.onUseLocation}><LocateFixed size={15} />{t(props.locating ? 'Finding your location…' : 'Use my location')}</button><button className="feature-text-button" disabled={props.busy || props.locating || props.cityBusy} type="button" onClick={props.onFindCity}><MapPin size={15} />{t(props.cityBusy ? 'Finding cities…' : 'Find city on map')}</button><p>{t('Use GPS or choose a city to search by distance. Location is requested only when you choose.')}</p></div>}
    {props.cities && <div className="city-options" aria-live="polite">{props.cities.length === 0 ? <p>{t('No matching cities. Try a city and country, or search the catalog directly.')}</p> : <><p>{t('Choose your city to search nearby:')}</p>{props.cities.map((result) => <button className="feature-button secondary" type="button" key={result.id} onClick={() => props.onMapCitySelect(result)}>{result.label}</button>)}</>}<small>{t('City data by')} <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> / GeoNames</small></div>}
  </form>
}
