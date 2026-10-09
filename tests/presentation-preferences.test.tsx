// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PresentationProvider, usePresentation } from '../src/presentation/PresentationProvider'
import { DisplayControls } from '../src/presentation/DisplayControls'

function PresentationPreview() {
  const { t, locale } = usePresentation()
  return <><DisplayControls /><p>{t('Upcoming events')}</p><time>{new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date('2027-01-05'))}</time></>
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); document.documentElement.removeAttribute('data-theme') })
describe('language and monochrome appearance', () => {
  it('switches language and dates without losing the page and persists both preferences', async () => {
    const user = userEvent.setup()
    const view = render(<PresentationProvider><PresentationPreview /></PresentationProvider>)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR')
    expect(screen.getByText('Próximos eventos')).toBeTruthy()
    expect(screen.getByText('janeiro')).toBeTruthy()
    expect(document.documentElement.lang).toBe('pt-BR')
    await user.click(screen.getByRole('button', { name: /tema claro/i }))
    expect(document.documentElement.dataset.theme).toBe('light')
    view.unmount()
    render(<PresentationProvider><PresentationPreview /></PresentationProvider>)
    expect(screen.getByText('Próximos eventos')).toBeTruthy()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
  it('ignores corrupted preferences and keeps controls usable when storage fails', async () => {
    localStorage.setItem('schedule.presentation.v1', '{broken')
    render(<PresentationProvider><PresentationPreview /></PresentationProvider>)
    expect(screen.getByText('Upcoming events')).toBeTruthy()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
