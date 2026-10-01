import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { accountErrorMessage, eventInterests, parsePreferences, type EventBudget, type EventInterest, type EventPreferences } from './account-validation'

interface PreferenceQuestionsProps {
  initialPreferences?: EventPreferences
  onSave: (preferences: EventPreferences) => Promise<void>
  onSignOut: () => Promise<void>
  onCancel?: () => void
}

export function PreferenceQuestions({ initialPreferences, onSave, onSignOut, onCancel }: PreferenceQuestionsProps): ReactNode {
  const [interests, setInterests] = useState<readonly EventInterest[]>(initialPreferences?.interests ?? [])
  const [radiusKm, setRadiusKm] = useState(initialPreferences?.radiusKm ?? 0)
  const [budget, setBudget] = useState<EventBudget | ''>(initialPreferences?.budget ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const preferences = parsePreferences({ interests, radiusKm, budget })
    if (!preferences) { setError('Please answer all three questions to personalize your events.'); return }
    setSaving(true); setError('')
    try { await onSave(preferences) } catch (failure) { setError(accountErrorMessage(failure)) } finally { setSaving(false) }
  }

  function toggleInterest(interest: EventInterest): void {
    setInterests((current) => current.includes(interest) ? current.filter((value) => value !== interest) : [...current, interest])
  }

  return <main className="preferences-page">
    <div className="preferences-header"><a className="account-brand" href="."><span>S</span> schedule</a><button className="feature-text-button" onClick={() => {
      void onSignOut().catch((failure: unknown) => setError(accountErrorMessage(failure)))
    }}>Sign out</button></div>
    <section className="preferences-panel">
      <span className="preference-spark"><Sparkles size={24} /></span>
      <span className="feature-kicker">Three questions. More possibilities.</span>
      <h1>A little more <em>you.</em></h1>
      <p className="feature-subtitle">Tell us what makes a good day. You can change these anytime.</p>
      <form className="preference-form" onSubmit={(event) => void save(event)}>
        <fieldset disabled={saving}><legend><span>01</span> What are you into?</legend><p>Pick one or more interests.</p><div className="interest-options">{eventInterests.map((interest) => <label className={interests.includes(interest) ? 'selected' : ''} key={interest}><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} />{interest.charAt(0).toUpperCase() + interest.slice(1)}</label>)}</div></fieldset>
        <fieldset disabled={saving}><legend><span>02</span> How far would you go?</legend><p>Your default radius when searching near your location.</p><label className="feature-form">Travel distance<select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}><option value={0} disabled>Choose a distance</option>{[5, 10, 25, 50, 100].map((distance) => <option key={distance} value={distance}>Within {distance} km</option>)}</select></label></fieldset>
        <fieldset disabled={saving}><legend><span>03</span> What’s your event budget?</legend><p>We’ll give these events a little more priority.</p><div className="budget-options">{([{ value: 'free', label: 'Free events' }, { value: 'paid', label: 'Paid experiences' }, { value: 'any', label: 'A bit of everything' }] as const).map((option) => <label className={budget === option.value ? 'selected' : ''} key={option.value}><input type="radio" name="budget" value={option.value} checked={budget === option.value} onChange={() => setBudget(option.value)} />{option.label}</label>)}</div></fieldset>
        {error && <p className="feature-error" role="alert">{error}</p>}
        <div className="preference-actions">{onCancel && <button className="feature-button secondary" type="button" disabled={saving} onClick={onCancel}>Cancel</button>}<button className="feature-button" disabled={saving} type="submit">{saving ? 'Saving…' : initialPreferences ? 'Save preferences' : 'Find my events'}<ArrowRight size={17} /></button></div>
      </form>
    </section>
  </main>
}
