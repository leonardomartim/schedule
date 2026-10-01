import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, MapPin, Sparkles } from 'lucide-react'
import { accountErrorMessage, validateRegistration, type RegistrationFields } from './account-validation'

interface AuthScreenProps {
  configured: boolean
  initialError?: string
  onSignIn: (identifier: string, password: string) => Promise<void>
  onRegister: (fields: RegistrationFields) => Promise<boolean>
  onGoogle: () => Promise<void>
}

export function AuthScreen({ configured, initialError = '', onSignIn, onRegister, onGoogle }: AuthScreenProps): ReactNode {
  const [registering, setRegistering] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  const [notice, setNotice] = useState('')
  useEffect(() => { setError(initialError) }, [initialError])

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(''); setNotice('')
    const fields = { username: identifier, email, password }
    const validation = registering ? validateRegistration(fields) : null
    if (validation) { setError(validation); return }
    setBusy(true)
    try {
      if (registering) {
        const signedIn = await onRegister(fields)
        if (!signedIn) setNotice('Check your email to confirm your account, then sign in to answer three quick preference questions. If you already have an account, sign in instead.')
      } else await onSignIn(identifier, password)
    } catch (failure) { setError(accountErrorMessage(failure)) } finally { setBusy(false) }
  }

  async function googleSignIn(): Promise<void> {
    setBusy(true); setError(''); setNotice('')
    try { await onGoogle() } catch (failure) { setError(accountErrorMessage(failure)) } finally { setBusy(false) }
  }

  return <main className="account-page">
    <section className="account-story">
      <a className="account-brand" href="."><span>S</span> schedule</a>
      <div className="account-story-copy">
        <span className="feature-kicker">A little more life in your day</span>
        <h1>Make room for<br />something <em>good.</em></h1>
        <p>Your plans, your interests, your neighborhood. Find something worth stepping out for.</p>
        <div className="account-highlights">
          <div><MapPin size={19} /><span>Discover events close to you</span></div>
          <div><Sparkles size={19} /><span>Recommendations that feel like you</span></div>
          <div><CalendarDays size={19} /><span>Keep your day in one calm place</span></div>
        </div>
      </div>
      <span className="account-caption">A clear day is a kind of freedom.</span>
    </section>
    <section className="account-form-panel">
      <div className="account-form-wrap">
        <span className="feature-kicker">Your personal space</span>
        <h2>{registering ? 'Start your next chapter.' : 'Welcome back.'}</h2>
        <p className="feature-subtitle">{registering ? 'Create an account. We’ll get to know you in three questions.' : 'A good day starts with a little possibility.'}</p>
        {!configured && <p className="feature-error" role="alert">Sign-in is not configured yet. Please contact the site owner.</p>}
        <button className="feature-button secondary full-width" disabled={busy || !configured} onClick={() => void googleSignIn()}><span aria-hidden="true" className="google-letter">G</span> Continue with Google</button>
        <div className="account-divider"><span>or {registering ? 'register' : 'sign in'} with a password</span></div>
        <form onSubmit={(event) => void submit(event)} className="feature-form">
          <label>{registering ? 'Username' : 'Username or email'}<input autoComplete="username" required maxLength={registering ? 24 : 254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={registering ? 'your_username' : 'Enter your username or email'} /></label>
          {registering && <div><label>Email<input autoComplete="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" aria-describedby="email-purpose" /></label><small id="email-purpose">For account confirmation and recovery.</small></div>}
          <label>Password<input autoComplete={registering ? 'new-password' : 'current-password'} type="password" required minLength={registering ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={registering ? 'At least 8 characters' : 'Your password'} /></label>
          {error && <p className="feature-error" role="alert">{error}</p>}
          {notice && <p className="feature-notice" role="status">{notice}</p>}
          <button className="feature-button full-width" disabled={busy || !configured} type="submit">{busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></button>
        </form>
        <p className="account-switch">{registering ? 'Already have an account?' : 'New to Schedule?'} <button disabled={busy} onClick={() => { setRegistering(!registering); setError(''); setNotice(''); setPassword('') }}>{registering ? 'Sign in instead' : 'Create an account'}</button></p>
      </div>
    </section>
  </main>
}
