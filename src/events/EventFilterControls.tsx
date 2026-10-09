import { usePresentation } from '../presentation/PresentationProvider'
import type { ReactNode } from 'react'
import { eventCategories } from './event-discovery'
import type { EventFilters } from './event-filters'

interface EventFilterControlsProps { filters: EventFilters; hasCoordinates: boolean; onChange: (filters: EventFilters) => void; onClear: () => void }

export function EventFilterControls({ filters, hasCoordinates, onChange, onClear }: EventFilterControlsProps): ReactNode {
  const { t } = usePresentation()

  return <div className="event-filter-fields">
    <label>{t("Category")}<select value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value as EventFilters['category'] })}><option value="all">{t("All categories")}</option>{eventCategories.map((interest) => <option value={interest} key={interest}>{t(interest.charAt(0).toUpperCase() + interest.slice(1))}</option>)}</select></label>
    <label>{t("Price")}<select value={filters.budget} onChange={(event) => onChange({ ...filters, budget: event.target.value as EventFilters['budget'] })}><option value="any">{t("All prices")}</option><option value="free">{t("Free only")}</option><option value="paid">{t("Paid only")}</option></select></label>
    <label>{t("From date")}<input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} /></label>
    <label>{t("To date")}<input type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} /></label>
    <label>{t("Sort by")}<select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as EventFilters['sort'] })}><option value="recommended">{t("Best matches")}</option><option value="soonest">{t("Soonest first")}</option><option value="nearest" disabled={!hasCoordinates}>{t("Nearest first")}</option><option value="price">{t("Lowest price")}</option></select></label>
    <button className="feature-text-button" type="button" onClick={onClear}>{t("Clear filters")}</button>
  </div>
}
