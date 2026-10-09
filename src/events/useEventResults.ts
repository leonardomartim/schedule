import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventPreferences } from '../account/account-validation'
import { accountErrorMessage } from '../account/account-validation'
import { supabase } from '../account/supabase-client'
import type { DiscoveredEvent, EventSearch } from './event-discovery'
import { defaultEventFilters } from './event-filters'
import type { PublicEventPage } from './public-event-contract'
import { searchPublicEvents } from './public-event-service'
import { searchCatalogEvents } from './event-service'
import { loadSearchCity, rememberSearchCity } from './search-location-storage'

export function useEventResults(preferences: EventPreferences, publicMode: boolean) {
  const [events, setEvents] = useState<DiscoveredEvent[]>([])
  const [publicPage, setPublicPage] = useState<PublicEventPage | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [catalogWarning, setCatalogWarning] = useState(false)
  const [committedQuery, setCommittedQuery] = useState('')
  const version = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const initialRequest = useRef(false)
  const committed = useRef<EventSearch>({ city: loadSearchCity(), query: '', radiusKm: preferences.radiusKm })
  const lastAttempt = useRef({ page: 1, append: false })
  const requestEvents = useCallback(async (search: EventSearch, page = 1, append = false, initial = false): Promise<void> => {
    controller.current?.abort()
    const activeController = new AbortController(); controller.current = activeController
    const activeVersion = ++version.current
    initialRequest.current = initial
    committed.current = search; lastAttempt.current = { page, append }
    setBusy(true); setError(''); setCatalogWarning(false)
    if (!append) { setEvents([]); setPublicPage(null); setSearched(false) }
    const hasCatalog = !append && !publicMode && Boolean(supabase) && Boolean(search.city.trim() || search.coordinates) && search.filters?.category !== 'other'
    const catalogRequest = hasCatalog && supabase ? searchCatalogEvents(supabase, search, preferences) : Promise.resolve([])
    try {
      const [publicResult, catalogResult] = await Promise.allSettled([searchPublicEvents(search, activeController.signal, page), catalogRequest])
      if (activeController.signal.aborted || version.current !== activeVersion) return
      if (publicResult.status === 'rejected' && (!hasCatalog || catalogResult.status === 'rejected')) throw publicResult.reason as unknown
      const results = [...(catalogResult.status === 'fulfilled' ? catalogResult.value : []), ...(publicResult.status === 'fulfilled' ? publicResult.value.events : [])]
      setEvents((current) => [...new Map([...(append ? current : []), ...results].map((event) => [event.id, event])).values()])
      if (publicResult.status === 'fulfilled') setPublicPage(publicResult.value)
      setCatalogWarning(publicResult.status === 'rejected' || catalogResult.status === 'rejected')
      setCommittedQuery(search.query); setSearched(!initial)
      if (!search.coordinates) rememberSearchCity(search.city)
    } catch (failure: unknown) { if (!activeController.signal.aborted && version.current === activeVersion) setError(accountErrorMessage(failure)) }
    finally { if (version.current === activeVersion) { initialRequest.current = false; setBusy(false) } }
  }, [preferences, publicMode])
  useEffect(() => {
    void requestEvents(committed.current, 1, false, true)
    return () => { controller.current?.abort(); version.current += 1 }
  }, [requestEvents])
  function cancelSearch(): void {
    setError('')
    if (initialRequest.current) return
    controller.current?.abort(); version.current += 1; setBusy(false)
  }
  return { events, publicPage, busy, error, setError, searched, committedQuery, catalogWarning, cancelSearch,
    search: (search: EventSearch) => requestEvents(search),
    retry: () => requestEvents(committed.current, lastAttempt.current.page, lastAttempt.current.append),
    loadMore: () => requestEvents(committed.current, (publicPage?.page ?? 1) + 1, true),
    resetSearch: (radiusKm: number) => requestEvents({ city: '', query: '', radiusKm, filters: { ...defaultEventFilters } }),
  }
}
