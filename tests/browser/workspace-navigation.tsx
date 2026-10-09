import { StrictMode, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { AccountWorkspace } from '../../src/workspace/AccountWorkspace'
import { PreferenceQuestions } from '../../src/account/PreferenceQuestions'
import { PresentationProvider } from '../../src/presentation/PresentationProvider'
import type { EventPreferences } from '../../src/account/account-validation'
import '../../src/styles.css'
import '../../src/features.css'
import '../../src/events/public-landing.css'
import '../../src/presentation/theme.css'

// Component fixture only: no Supabase session or access to private account data.
function NavigationBrowserFixture(): ReactNode {
  const [preferences, setPreferences] = useState<EventPreferences>({ interests: ['music'], radiusKm: 25, budget: 'any' })
  const [editing, setEditing] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  if (signedOut) return <main><h1>Local test: signed out</h1></main>
  if (editing) return <PreferenceQuestions initialPreferences={preferences} onCancel={() => setEditing(false)} onSignOut={async () => setSignedOut(true)} onSave={async (next) => { setPreferences(next); setEditing(false) }} />
  return <AccountWorkspace account={{ userId: 'local-navigation-fixture', displayName: 'Local test', preferences, onEditPreferences: () => setEditing(true), onSignOut: async () => setSignedOut(true) }} />
}
createRoot(document.getElementById('root')!).render(<StrictMode><PresentationProvider><NavigationBrowserFixture /></PresentationProvider></StrictMode>)
