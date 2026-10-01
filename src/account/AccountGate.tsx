import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { accountReturnUrl, supabase } from './supabase-client'
import { accountErrorMessage, type EventPreferences } from './account-validation'
import { loadAccountProfile, registerAccount, saveAccountPreferences, signInAccount, startGoogleSignIn, type AccountProfile } from './account-service'
import { AuthScreen } from './AuthScreen'
import { PreferenceQuestions } from './PreferenceQuestions'

export interface SignedInAccount {
  userId: string
  displayName: string
  preferences: EventPreferences
  onSignOut: () => Promise<void>
  onEditPreferences: () => void
}

export function AccountGate({ children }: { children: (account: SignedInAccount) => ReactNode }): ReactNode {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [error, setError] = useState('')
  const [editingPreferences, setEditingPreferences] = useState(false)
  const [retry, setRetry] = useState(0)
  const authRevision = useRef(0)

  useEffect(() => {
    if (!supabase) return
    let active = true
    const revision = authRevision.current
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      authRevision.current += 1
      setSession(nextSession)
      if (event !== 'INITIAL_SESSION') { setLoading(false); setError('') }
    })
    void Promise.all([supabase.auth.initialize(), supabase.auth.getSession()]).then(([initialized, { data, error: authError }]) => {
      if (!active) return
      if (authRevision.current === revision) setSession(data.session)
      setLoading(false)
      const callbackError = initialized.error || authError
      if (callbackError) setError(callbackError.message)
    }).catch((failure: unknown) => { if (active) { setError(accountErrorMessage(failure)); setLoading(false) } })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    let active = true
    setProfile(null); setEditingPreferences(false)
    if (supabase && userId) {
      setError('')
      void loadAccountProfile(supabase, userId).then((nextProfile) => {
        if (active) setProfile(nextProfile)
      }).catch(() => { if (active) setError('We could not load your profile. Please try again or contact the site owner.') })
    }
    return () => { active = false }
  }, [userId, retry])

  async function signOut(): Promise<void> {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
    setProfile(null); setSession(null); setError('')
  }

  if (loading) return <div className="account-loading" role="status">Opening your space…</div>
  if (!session) return <AuthScreen configured={Boolean(supabase)} initialError={error || new URLSearchParams(window.location.search).get('error_description') || ''}
    onSignIn={async (identifier, password) => { if (supabase) await signInAccount(supabase, identifier, password) }}
    onRegister={async (fields) => { if (!supabase) return false; const data = await registerAccount(supabase, fields, accountReturnUrl()); return Boolean(data.session) }}
    onGoogle={async () => { if (supabase) await startGoogleSignIn(supabase, accountReturnUrl()) }} />
  if (!profile || profile.id !== session.user.id) return <div className="account-loading"><p role={error ? 'alert' : 'status'}>{error || 'Loading your profile…'}</p>{error && <button className="feature-button" onClick={() => setRetry((value) => value + 1)}>Try again</button>}<button className="feature-text-button" onClick={() => void signOut().catch((failure: unknown) => setError(accountErrorMessage(failure)))}>Sign out</button></div>
  if (!profile.preferences || editingPreferences) return <PreferenceQuestions initialPreferences={profile.preferences ?? undefined} onSignOut={signOut} onCancel={profile.preferences ? () => setEditingPreferences(false) : undefined} onSave={async (preferences) => {
    if (!supabase) throw new Error('Account connection unavailable.')
    await saveAccountPreferences(supabase, profile.id, preferences)
    setProfile({ ...profile, preferences }); setEditingPreferences(false)
  }} />
  return children({ userId: session.user.id, displayName: profile.username || profile.display_name || 'Your space', preferences: profile.preferences, onSignOut: signOut, onEditPreferences: () => setEditingPreferences(true) })
}
