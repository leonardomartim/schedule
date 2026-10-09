import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { LogOut, Settings2 } from 'lucide-react'
import { usePresentation } from '../presentation/PresentationProvider'
import { Avatar } from './WorkspacePrimitives'

interface AccountMenuProps {
  displayName: string
  isSigningOut: boolean
  onEditPreferences: () => void
  onSignOut: () => void
}

export function AccountMenu({ displayName, isSigningOut, onEditPreferences, onSignOut }: AccountMenuProps): ReactNode {
  const { t } = usePresentation()
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function closeOutside(event: Event): void {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return <div className="workspace-account" ref={containerRef}>
    <button type="button" className="workspace-account-trigger" ref={triggerRef} aria-label={t('Open account menu')} title={t('Open account menu')} aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} onClick={() => setIsOpen((open) => !open)}><Avatar displayName={displayName} small /></button>
    {isOpen && <section className="workspace-account-panel" id={panelId} role="region" aria-label={t('Account actions')}>
      <div className="workspace-account-identity"><strong>{displayName}</strong><span>{t('Personal space')}</span></div>
      <button type="button" onClick={() => { setIsOpen(false); onEditPreferences() }}><Settings2 size={17} aria-hidden="true" />{t('Preferences')}</button>
      <button type="button" onClick={onSignOut} disabled={isSigningOut}><LogOut size={17} aria-hidden="true" />{t(isSigningOut ? 'Signing out…' : 'Sign out')}</button>
    </section>}
  </div>
}
