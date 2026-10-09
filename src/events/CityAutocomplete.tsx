import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import { usePresentation } from '../presentation/PresentationProvider'
import { searchPublicCities, type PublicCity } from './public-location-service'

interface CityAutocompleteProps { value: string; onChange: (value: string) => void; onSelect: (city: PublicCity) => void }
export function CityAutocomplete({ value, onChange, onSelect }: CityAutocompleteProps): ReactNode {
  const { t, language } = usePresentation()
  const listId = useId()
  const [cities, setCities] = useState<PublicCity[]>([])
  const [focused, setFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [unavailable, setUnavailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const selectedValue = useRef<string | null>(null)
  useEffect(() => {
    setCities([]); setSelectedIndex(-1); setUnavailable(false); setLoading(false)
    if (!focused || value.trim().length < 2 || value === selectedValue.current) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      void searchPublicCities(value, controller.signal, language === 'pt-BR' ? 'pt' : 'en').then((results) => {
        if (!controller.signal.aborted) setCities(results)
      }).catch(() => { if (!controller.signal.aborted) setUnavailable(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [value, focused, language])
  function select(city: PublicCity): void {
    selectedValue.current = city.name ?? city.label.split(',')[0]
    setCities([]); setSelectedIndex(-1); setFocused(false); onSelect(city)
  }
  function navigateSuggestions(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') { event.preventDefault(); setFocused(false); return }
    if (!cities.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + cities.length) % cities.length)
    } else if (event.key === 'Enter' && selectedIndex >= 0) { event.preventDefault(); select(cities[selectedIndex]) }
  }
  const expanded = focused && cities.length > 0
  return <div className="city-autocomplete"><label htmlFor={`${listId}-input`}>{t('City')}</label><div className="input-with-icon"><MapPin size={17} aria-hidden="true" /><input id={`${listId}-input`} name="city" autoComplete="address-level2" maxLength={120} value={value} placeholder={t('All cities')} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={listId} aria-activedescendant={expanded && selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(event) => { selectedValue.current = null; setFocused(true); onChange(event.target.value) }} onKeyDown={navigateSuggestions} /></div>
    {expanded && <ul className="city-suggestions" id={listId} role="listbox" aria-label={t('Suggested cities')}>{cities.map((city, index) => <li id={`${listId}-${index}`} key={city.id} role="option" aria-selected={selectedIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => select(city)}><MapPin size={15} /><span>{city.label}</span></li>)}</ul>}
    {focused && loading && <small role="status">{t('Finding cities…')}</small>}{focused && unavailable && <small role="status">{t('You can enter a city manually and keep searching.')}</small>}
  </div>
}
