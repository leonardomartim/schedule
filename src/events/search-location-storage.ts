const cityStorageKey = 'schedule.search-city.v1'
export function loadSearchCity(): string {
  try { const value = localStorage.getItem(cityStorageKey) ?? ''; return value.length <= 120 ? value : '' } catch { return '' }
}
export function rememberSearchCity(city: string): void {
  try { if (city.trim()) localStorage.setItem(cityStorageKey, city.trim()); else localStorage.removeItem(cityStorageKey) } catch { /* Manual location entry remains available. */ }
}
