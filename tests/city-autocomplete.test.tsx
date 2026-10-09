// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CityAutocomplete } from '../src/events/CityAutocomplete'
import { searchPublicCities } from '../src/events/public-location-service'
vi.mock('../src/events/public-location-service', () => ({ searchPublicCities: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
function CitySearch() {
  const [city, setCity] = useState('')
  return <CityAutocomplete value={city} onChange={setCity} onSelect={(selected) => setCity(selected.name ?? selected.label.split(',')[0])} />
}
describe('city autocomplete', () => {
  it('suggests cities while typing and fills the field with a keyboard selection', async () => {
    vi.mocked(searchPublicCities).mockResolvedValue([{ id: 1, name: 'São Paulo', label: 'São Paulo, Brasil', latitude: -23.55, longitude: -46.63 }])
    const user = userEvent.setup()
    render(<CitySearch />)
    const field = screen.getByRole('combobox', { name: 'City or country' })
    await user.type(field, 'S')
    expect(searchPublicCities).not.toHaveBeenCalled()
    await user.type(field, 'ão')
    await screen.findByRole('option', { name: 'São Paulo, Brasil' })
    await user.keyboard('{ArrowDown}{Enter}')
    expect(field).toHaveProperty('value', 'São Paulo')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
  it('keeps manual entry available when suggestions fail and closes with Escape', async () => {
    vi.mocked(searchPublicCities).mockRejectedValue(new Error('Offline'))
    render(<CitySearch />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('combobox', { name: 'City or country' }), 'Recife')
    await waitFor(() => expect(searchPublicCities).toHaveBeenCalled())
    expect(await screen.findByText(/You can enter a city manually/)).toBeTruthy()
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'Recife')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(/You can enter a city manually/)).toBeNull()
  })
})
