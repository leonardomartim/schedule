import type { ReactNode } from 'react'
import { eventInterests } from '../account/account-validation'
import type { EventFilters } from './event-filters'

interface EventFilterControlsProps { filters: EventFilters; hasCoordinates: boolean; onChange: (filters: EventFilters) => void; onClear: () => void }

export function EventFilterControls({ filters, hasCoordinates, onChange, onClear }: EventFilterControlsProps): ReactNode {
  return <div className="event-filter-fields">
    <label>Category<select value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value as EventFilters['category'] })}><option value="all">All categories</option>{eventInterests.map((interest) => <option value={interest} key={interest}>{interest.charAt(0).toUpperCase() + interest.slice(1)}</option>)}</select></label>
    <label>Price<select value={filters.budget} onChange={(event) => onChange({ ...filters, budget: event.target.value as EventFilters['budget'] })}><option value="any">All prices</option><option value="free">Free only</option><option value="paid">Paid only</option></select></label>
    <label>From date<input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} /></label>
    <label>To date<input type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} /></label>
    <label>Sort by<select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as EventFilters['sort'] })}><option value="recommended">Best matches</option><option value="soonest">Soonest first</option><option value="nearest" disabled={!hasCoordinates}>Nearest first</option><option value="price">Lowest price</option></select></label>
    <button className="feature-text-button" type="button" onClick={onClear}>Clear filters</button>
  </div>
}
