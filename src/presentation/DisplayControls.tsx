import { Languages, Moon, Sun } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { usePresentation, type PageLanguage } from './PresentationProvider'

export function DisplayControls(): ReactNode {
  const { language, theme, setLanguage, setTheme, t } = usePresentation()
  const languageId = useId()
  return <div className="display-controls">
    <label className="language-control" htmlFor={languageId}><Languages size={16} aria-hidden="true" /><span className="sr-only">{t('Language')}</span><select id={languageId} value={language} onChange={(event) => setLanguage(event.target.value as PageLanguage)}><option value="pt-BR" lang="pt-BR">Português</option><option value="en" lang="en">English</option></select></label>
    <button type="button" className="theme-control" aria-label={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} title={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span className="theme-control-label">{t(theme === 'dark' ? 'Light' : 'Dark')}</span></button>
  </div>
}
