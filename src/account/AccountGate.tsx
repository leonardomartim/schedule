import { usePresentation } from '../presentation/PresentationProvider'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { accountReturnUrl, supabase } from './supabase-client'
import { accountErrorMessage, type EventPreferences } from './account-validation'
import { loadAccountProfile, registerAccount, saveAccountPreferences, signInAccount, startGoogleSignIn, type AccountProfile } from './account-service'
const AuthScreen = lazy(() => import('./AuthScreen').then((module) => ({ default: module.AuthScreen })))
const PreferenceQuestions = lazy(() => import('./PreferenceQuestions').then((module) => ({ default: module.PreferenceQuestions })))

export interface SignedInAccount {
  userId: string
  displayName: string
  preferences: EventPreferences
  onSignOut: () => Promise<void>
  onEditPreferences: () => void
}

export function AccountGate({ children, signedOutContent }: { children: (account: SignedInAccount) => ReactNode; signedOutContent?: (authScreen: ReactNode, authenticationError: string) => ReactNode }): ReactNode {
  const { t } = usePresentation()

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

  if (loading) return <div className="account-loading" role="status">{t("Opening your space…")}</div>
  if (!session) {
    const authScreen = <Suspense fallback={<p role="status">{t('Opening your space…')}</p>}><AuthScreen embedded={Boolean(signedOutContent)} configured={Boolean(supabase)} initialError={error || new URLSearchParams(window.location.search).get('error_description') || ''}
    onSignIn={async (identifier, password) => { if (supabase) await signInAccount(supabase, identifier, password) }}
    onRegister={async (fields) => { if (!supabase) return false; const data = await registerAccount(supabase, fields, accountReturnUrl()); return Boolean(data.session) }}
    onGoogle={async () => { if (supabase) await startGoogleSignIn(supabase, accountReturnUrl()) }} /></Suspense>
    return signedOutContent ? signedOutContent(authScreen, error) : authScreen
  }
  if (!profile || profile.id !== session.user.id) return <div className="account-loading"><p role={error ? 'alert' : 'status'}>{t(error || 'Loading your profile…')}</p>{error && <button className="feature-button" onClick={() => setRetry((value) => value + 1)}>{t("Try again")}</button>}<button className="feature-text-button" onClick={() => void signOut().catch((failure: unknown) => setError(accountErrorMessage(failure)))}>{t("Sign out")}</button></div>
  if (!profile.preferences || editingPreferences) return <Suspense fallback={<p role="status">{t('Opening your space…')}</p>}><PreferenceQuestions initialPreferences={profile.preferences ?? undefined} onSignOut={signOut} onCancel={profile.preferences ? () => setEditingPreferences(false) : undefined} onSave={async (preferences) => {
    if (!supabase) throw new Error('Account connection unavailable.')
    await saveAccountPreferences(supabase, profile.id, preferences)
    setProfile({ ...profile, preferences }); setEditingPreferences(false)
  }} /></Suspense>
  return children({ userId: session.user.id, displayName: profile.username || profile.display_name || 'Your space', preferences: profile.preferences, onSignOut: signOut, onEditPreferences: () => setEditingPreferences(true) })
}
