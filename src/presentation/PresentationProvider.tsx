import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { portugueseCopy } from './portuguese-copy'

export type PageLanguage = 'pt-BR' | 'en'
export type PageTheme = 'dark' | 'light'
interface PresentationPreferences { language: PageLanguage; theme: PageTheme }
interface PresentationContextValue extends PresentationPreferences {
  locale: string
  setLanguage: (language: PageLanguage) => void
  setTheme: (theme: PageTheme) => void
  t: (message: string, values?: Record<string, string | number>) => string
}
const preferenceKey = 'schedule.presentation.v1'
function readPresentationPreferences(): PresentationPreferences {
  const fallback: PresentationPreferences = { language: typeof navigator !== 'undefined' && navigator.language.startsWith('pt') ? 'pt-BR' : 'en', theme: typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark' }
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null')
    if (!stored || typeof stored !== 'object') return fallback
    const candidate = stored as Record<string, unknown>
    return { language: candidate.language === 'pt-BR' || candidate.language === 'en' ? candidate.language : fallback.language, theme: candidate.theme === 'light' || candidate.theme === 'dark' ? candidate.theme : fallback.theme }
  } catch { return fallback }
}
function createTranslator(language: PageLanguage): PresentationContextValue['t'] {
  return (message, values = {}) => {
    const translation = language === 'pt-BR' ? portugueseCopy[message] ?? message : message
    return translation.replace(/\{(\w+)\}/g, (match: string, key: string) => String(values[key] ?? match))
  }
}
const defaultPresentation: PresentationContextValue = { language: 'en', theme: 'dark', locale: 'en-US', setLanguage: () => undefined, setTheme: () => undefined, t: createTranslator('en') }
const PresentationContext = createContext<PresentationContextValue>(defaultPresentation)

export function PresentationProvider({ children }: { children: ReactNode }): ReactNode {
  const [preferences, setPreferences] = useState<PresentationPreferences>(readPresentationPreferences)
  useEffect(() => {
    document.documentElement.lang = preferences.language
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.style.colorScheme = preferences.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preferences.theme === 'light' ? '#ffffff' : '#101010')
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)) } catch { /* Presentation remains usable for this session. */ }
  }, [preferences])
  const presentation = useMemo<PresentationContextValue>(() => ({ ...preferences, locale: preferences.language === 'pt-BR' ? 'pt-BR' : 'en-US', setLanguage: (language) => setPreferences((current) => ({ ...current, language })), setTheme: (theme) => setPreferences((current) => ({ ...current, theme })), t: createTranslator(preferences.language) }), [preferences])
  return <PresentationContext.Provider value={presentation}>{children}</PresentationContext.Provider>
}
export function usePresentation(): PresentationContextValue { return useContext(PresentationContext) }
