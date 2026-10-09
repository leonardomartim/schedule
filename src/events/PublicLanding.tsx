import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { usePresentation } from '../presentation/PresentationProvider'
import { DisplayControls } from '../presentation/DisplayControls'
import { EventsView } from './EventsView'
import type { EventPreferences } from '../account/account-validation'
import './public-landing.css'

const publicPreferences: EventPreferences = { interests: [], radiusKm: 25, budget: 'any' }
export function PublicLanding({ authScreen, authenticationError = '' }: { authScreen: ReactNode; authenticationError?: string }): ReactNode {
  const { t } = usePresentation()
  const [authOpen, setAuthOpen] = useState(() => Boolean(authenticationError || new URLSearchParams(window.location.search).get('error_description')))
  useEffect(() => { if (authenticationError) setAuthOpen(true) }, [authenticationError])
  return <div className="public-landing">
    <header className="public-header"><a className="account-brand" href="."><span>S</span>schedule</a><a href="#discover" className="public-discover-link">{t('Explore events')}</a><div className="public-header-actions"><DisplayControls /><button className="feature-button" onClick={() => setAuthOpen(true)}>{t('Sign in')}<ArrowUpRight size={16} /></button></div></header>
    <main id="discover"><section className="public-hero"><span className="feature-kicker">{t('Events worth making time for.')}</span><h1>{t('Explore the city.')}<br /><em>{t('Make a little room.')}</em></h1><p>{t('Browse real events. Sign in to save your favorites and organize your day.')}</p><span className="public-region-label"><span />{t('Cities, countries and new possibilities')}</span></section>
      <EventsView publicMode preferences={publicPreferences} onRequestSignIn={() => setAuthOpen(true)} />
    </main>
    <footer className="public-footer"><span>schedule</span><p>{t('A clear day is a kind of freedom.')}</p><a href="https://www.sympla.com.br/" target="_blank" rel="noopener noreferrer">Sympla <ArrowUpRight size={13} /></a><a href="https://www.eventbrite.com/" target="_blank" rel="noopener noreferrer">Eventbrite <ArrowUpRight size={13} /></a></footer>
    {authOpen && <SignInDialog onClose={() => setAuthOpen(false)}>{authScreen}</SignInDialog>}
  </div>
}
function SignInDialog({ children, onClose }: { children: ReactNode; onClose: () => void }): ReactNode {
  const { t } = usePresentation()
  const dialog = useRef<HTMLDialogElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!previouslyFocused.current) previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = dialog.current
    if (element && typeof element.showModal === 'function') element.showModal()
    else element?.setAttribute('open', '')
    return () => previouslyFocused.current?.focus()
  }, [])
  return <dialog ref={dialog} className="sign-in-dialog" aria-label={t('Sign in to save your plans')} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="sign-in-dialog-content"><button className="dialog-back feature-text-button" onClick={onClose} aria-label={t('Close sign-in')}><X size={17} />{t('Back to events')}</button>{children}</div></dialog>
}
