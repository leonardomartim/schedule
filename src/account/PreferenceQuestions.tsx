import { DisplayControls } from '../presentation/DisplayControls'
import { usePresentation } from '../presentation/PresentationProvider'
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
  const { t } = usePresentation()

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
    <div className="preferences-header"><a className="account-brand" href="."><span>{t("S")}</span> {t("schedule")}</a><DisplayControls /><button className="feature-text-button" onClick={() => {
      void onSignOut().catch((failure: unknown) => setError(accountErrorMessage(failure)))
    }}>{t("Sign out")}</button></div>
    <section className="preferences-panel">
      <span className="preference-spark"><Sparkles size={24} /></span>
      <span className="feature-kicker">{t("Three questions. More possibilities.")}</span>
      <h1>{t("A little more")} <em>{t("you.")}</em></h1>
      <p className="feature-subtitle">{t("Tell us what makes a good day. You can change these anytime.")}</p>
      <form className="preference-form" onSubmit={(event) => void save(event)}>
        <fieldset disabled={saving}><legend><span>01</span> {t("What are you into?")}</legend><p>{t("Pick one or more interests.")}</p><div className="interest-options">{eventInterests.map((interest) => <label className={interests.includes(interest) ? 'selected' : ''} key={interest}><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} />{t(interest.charAt(0).toUpperCase() + interest.slice(1))}</label>)}</div></fieldset>
        <fieldset disabled={saving}><legend><span>02</span> {t("How far would you go?")}</legend><p>{t("Your default radius when searching near your location.")}</p><label className="feature-form">{t("Travel distance")}<select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}><option value={0} disabled>{t("Choose a distance")}</option>{[5, 10, 25, 50, 100].map((distance) => <option key={distance} value={distance}>{t('Within {distance} km', { distance })}</option>)}</select></label></fieldset>
        <fieldset disabled={saving}><legend><span>03</span> {t("What’s your event budget?")}</legend><p>{t("We’ll give these events a little more priority.")}</p><div className="budget-options">{([{ value: 'free', label: 'Free events' }, { value: 'paid', label: 'Paid experiences' }, { value: 'any', label: 'A bit of everything' }] as const).map((option) => <label className={budget === option.value ? 'selected' : ''} key={option.value}><input type="radio" name="budget" value={option.value} checked={budget === option.value} onChange={() => setBudget(option.value)} />{t(option.label)}</label>)}</div></fieldset>
        {error && <p className="feature-error" role="alert">{t(error)}</p>}
        <div className="preference-actions">{onCancel && <button className="feature-button secondary" type="button" disabled={saving} onClick={onCancel}>{t("Cancel")}</button>}<button className="feature-button" disabled={saving} type="submit">{t(saving ? 'Saving…' : initialPreferences ? 'Save preferences' : 'Find my events')}<ArrowRight size={17} /></button></div>
      </form>
    </section>
  </main>
}
