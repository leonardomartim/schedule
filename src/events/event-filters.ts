import { eventPreferenceScore, type DiscoveredEvent } from './event-discovery'
import type { EventBudget, EventInterest, EventPreferences } from '../account/account-validation'

export interface EventFilters {
  category: EventInterest | 'all'
  budget: EventBudget
  dateFrom: string
  dateTo: string
  sort: 'recommended' | 'soonest' | 'nearest' | 'price'
}

export const defaultEventFilters: EventFilters = { category: 'all', budget: 'any', dateFrom: '', dateTo: '', sort: 'recommended' }

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function validateEventFilters(filters: EventFilters): string | null {
  for (const value of [filters.dateFrom, filters.dateTo]) {
    if (!value) continue
    const date = parseLocalDate(value)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) ||
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== value) return 'Choose a valid event date.'
  }
  return filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo ? 'The end date must be on or after the start date.' : null
}

export function eventFilterDateBounds(filters: EventFilters): { after: string | null; before: string | null } {
  const end = filters.dateTo ? parseLocalDate(filters.dateTo) : null
  if (end) end.setDate(end.getDate() + 1)
  return { after: filters.dateFrom ? parseLocalDate(filters.dateFrom).toISOString() : null, before: end?.toISOString() ?? null }
}

export function filterEventResults(events: DiscoveredEvent[], filters: EventFilters, preferences: EventPreferences, savedIds: string[] = [], savedOnly = false): DiscoveredEvent[] {
  const { after, before } = eventFilterDateBounds(filters)
  const saved = new Set(savedIds)
  return events.filter((event) => (filters.category === 'all' || event.category === filters.category) &&
    (filters.budget === 'any' || (filters.budget === 'free' ? event.price === 0 : event.price !== null && event.price > 0)) &&
    (!after || Date.parse(event.startsAt) >= Date.parse(after)) && (!before || Date.parse(event.startsAt) < Date.parse(before)) &&
    (!savedOnly || saved.has(event.id))).sort((first, second) => {
      if (filters.sort === 'nearest') return (first.distanceKm ?? Infinity) - (second.distanceKm ?? Infinity) || Date.parse(first.startsAt) - Date.parse(second.startsAt)
      if (filters.sort === 'price') return (first.price ?? Infinity) - (second.price ?? Infinity) || Date.parse(first.startsAt) - Date.parse(second.startsAt)
      if (filters.sort === 'recommended') {
        const scoreDifference = eventPreferenceScore(second, preferences) - eventPreferenceScore(first, preferences)
        if (scoreDifference) return scoreDifference
      }
      return Date.parse(first.startsAt) - Date.parse(second.startsAt)
    })
}
