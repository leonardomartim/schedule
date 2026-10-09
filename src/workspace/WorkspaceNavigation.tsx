import { usePresentation } from '../presentation/PresentationProvider'
import { DisplayControls } from '../presentation/DisplayControls'
import type { ReactNode } from 'react'
import { CalendarDays, CirclePlus, Compass, NotebookPen, Search, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import type { SignedInAccount } from '../account/AccountGate'
import { Avatar, iconButtonClassName } from './WorkspacePrimitives'
import { AccountMenu } from './AccountMenu'
import './workspace-navigation.css'

export type WorkspaceView = 'Explore' | 'Today' | 'Notes' | 'Trash'

export function Sidebar({ account, onSignOut, isSigningOut, activeNoteCount, activeView, isOpen, itemCount, onCreateNote, onSelectView, trashCount }: { account: SignedInAccount; onSignOut: () => void; isSigningOut: boolean; activeNoteCount: number; activeView: WorkspaceView; isOpen: boolean; itemCount: number; onCreateNote: () => void; onSelectView: (view: WorkspaceView) => void; trashCount: number }): ReactNode {
  const { t } = usePresentation()

  const navigationItems = [{ label: 'Explore' as const, icon: Compass, count: null }, { label: 'Today' as const, icon: CalendarDays, count: itemCount }, { label: 'Notes' as const, icon: NotebookPen, count: activeNoteCount }, { label: 'Trash' as const, icon: Trash2, count: trashCount }]
  return <aside data-open={isOpen} className="workspace-sidebar z-40 flex w-62.5 flex-col border-r border-line bg-ink/95 px-4 pt-7 pb-5 shadow-[15px_0_50px_rgba(0,0,0,.35)] backdrop-blur md:shadow-none">
    <div className="workspace-navigation-links">
    <div className="flex items-center justify-between px-3 pb-8"><a className="flex items-center gap-2.5 text-base font-bold tracking-[-.4px]" href="."><span className="grid size-7 place-items-center rounded-lg bg-orange font-display text-lg font-bold text-ink">{t("S")}</span><span>{t("schedule")}</span></a><button className={`${iconButtonClassName} md:hidden`} aria-label={t("Close navigation")} onClick={() => onSelectView(activeView)}><X size={18} /></button></div>
    <button className="flex w-full items-center gap-2.5 rounded-md border border-line bg-surface-raised px-3 py-3 text-left text-sm font-semibold transition hover:border-muted" onClick={onCreateNote}><CirclePlus className="text-orange" size={18} /> {t("New note")} </button>
    <nav className="mt-10" aria-label={t("Main navigation")}><p className="mb-3 px-3 text-[10px] font-bold tracking-[.18em] text-muted uppercase">{t("Workspace")}</p>{navigationItems.map(({ label, icon: Icon, count }) => <button className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${activeView === label ? 'bg-surface-raised text-cream' : 'text-muted hover:bg-surface hover:text-cream'}`} key={label} onClick={() => onSelectView(label)}><Icon className={activeView === label ? 'text-orange' : ''} size={18} /><span>{t(label)}</span><span className="ml-auto text-xs text-muted">{count}</span></button>)}</nav>
    </div>
    <div className="workspace-navigation-footer"><div className="workspace-navigation-promo mb-5 flex gap-2.5 rounded-lg bg-surface px-3 py-3"><span className="grid size-7 place-items-center rounded-full bg-orange text-ink"><Sparkles size={16} /></span><div><strong className="block text-xs">{t("Make room for you")}</strong><span className="text-[11px] text-muted">{t("Find your next good plan.")}</span></div></div><button onClick={account.onEditPreferences} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-cream"><Settings2 size={18} /> {t("Preferences")}</button><div className="mt-2 flex items-center gap-2.5 border-t border-line px-2 pt-4"><Avatar displayName={account.displayName} /><div className="min-w-0"><strong className="block truncate text-xs">{account.displayName}</strong><span className="text-[11px] text-muted">{t("Personal space")}</span></div><button className="ml-auto shrink-0 text-[10px] text-muted hover:text-orange" disabled={isSigningOut} onClick={onSignOut}>{t(isSigningOut ? 'Signing out…' : 'Sign out')}</button></div></div>
  </aside>
}

export function Topbar({ displayName, activeView, isSigningOut, onEditPreferences, onSignOut, onSearchChange, searchTerm, timeLabel, timeZoneLabel }: { displayName: string; activeView: WorkspaceView; isSigningOut: boolean; onEditPreferences: () => void; onSignOut: () => void; onSearchChange: (value: string) => void; searchTerm: string; timeLabel: string; timeZoneLabel: string }): ReactNode {
  const { t } = usePresentation()

  return <header className="workspace-topbar flex h-18 items-center justify-between border-b border-line pl-12 md:h-20 md:pl-0"><div className="workspace-breadcrumb flex items-center gap-2.5 text-xs text-muted"><span>{t("Workspace")}</span><span>/</span><strong className="font-medium text-cream">{t(activeView)}</strong></div><div className="flex items-center gap-3"><time className="hidden text-xs text-muted lg:block" title={timeZoneLabel}>{timeLabel} · {timeZoneLabel}</time>{activeView === 'Today' && <label className="flex w-8 items-center gap-2 rounded border border-transparent p-2 text-muted transition focus-within:w-55 focus-within:border-line focus-within:bg-surface md:w-55"><Search size={17} /><input className="min-w-0 flex-1 bg-transparent text-xs text-cream outline-none placeholder:text-muted" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} aria-label={t("Search your day")} placeholder={t("Search your day")} /></label>}<DisplayControls /><AccountMenu key={activeView} displayName={displayName} isSigningOut={isSigningOut} onEditPreferences={onEditPreferences} onSignOut={onSignOut} /></div></header>
}

