import { usePresentation } from '../presentation/PresentationProvider'
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import type { SignedInAccount } from '../account/AccountGate'
import { accountErrorMessage } from '../account/account-validation'
import { addEventToAgenda, localDateKey, scheduleItemsForDate } from '../event-agenda'
import type { DiscoveredEvent } from '../events/event-discovery'
import { getScheduleProgress } from '../agenda-stacks'
import { getGreetingForHour } from '../greeting'
import { getLocalClockSnapshot } from '../local-clock'
import { moveNoteToTrash, permanentlyDeleteNote, restoreNoteFromTrash } from '../note-lifecycle'
import { loadNotes, loadScheduleItems, saveNotes, saveScheduleItems } from '../schedule-storage'
import type { Note, ScheduleItem } from '../types'
import { TodayView } from './TodayView'
import { NotesView, TrashView } from './NotesWorkspace'
import { Sidebar, Topbar, type WorkspaceView } from './WorkspaceNavigation'
import { iconButtonClassName } from './WorkspacePrimitives'

const EventsView = lazy(() => import('../events/EventsView').then((module) => ({ default: module.EventsView })))

export function AccountWorkspace({ account }: { account: SignedInAccount }): ReactNode {
  const { t, locale } = usePresentation()

  const [activeView, setActiveView] = useState<WorkspaceView>('Explore')
  const [items, setItems] = useState<ScheduleItem[]>(() => loadScheduleItems(account.userId).map((item) => ({ ...item, date: item.date ?? localDateKey(new Date()) })))
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(account.userId))
  const [accountError, setAccountError] = useState('')
  const [agendaSaved, setAgendaSaved] = useState(true)
  const [notesSaved, setNotesSaved] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const activeNotes = useMemo(() => notes.filter((note) => !note.deletedAt), [notes])
  const trashedNotes = useMemo(() => notes.filter((note) => note.deletedAt), [notes])
  const dayItems = useMemo(() => scheduleItemsForDate(items, localDateKey(selectedDate)), [items, selectedDate])
  const scheduleProgress = useMemo(() => getScheduleProgress(dayItems), [dayItems])
  const visibleItems = useMemo(() => dayItems.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(searchTerm.toLowerCase())), [dayItems, searchTerm])
  const localClock = useMemo(() => getLocalClockSnapshot(currentDate, locale), [currentDate, locale])

  useEffect(() => { setAgendaSaved(saveScheduleItems(items, account.userId)) }, [items, account.userId])
  useEffect(() => { setNotesSaved(saveNotes(notes, account.userId)) }, [notes, account.userId])
  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentDate(new Date()), 30_000)
    return () => window.clearInterval(clockInterval)
  }, [])

  function toggleItem(id: number): void {
    setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  function createScheduleItem(item: Omit<ScheduleItem, 'id' | 'completed'>): void {
    setItems((currentItems) => [...currentItems, { ...item, date: localDateKey(selectedDate), id: Math.max(Date.now(), ...currentItems.map((existing) => existing.id + 1)), completed: false }])
  }

  function addDiscoveredEvent(event: DiscoveredEvent): void { setItems((currentItems) => addEventToAgenda(currentItems, event)) }
  function removeScheduleItem(id: number): void { setItems((currentItems) => currentItems.filter((item) => item.id !== id)) }

  function createNote(): void {
    const newNote: Note = { id: Date.now(), title: t('Untitled note'), preview: '', updated: 'Just now', accent: 'orange' }
    setNotes((currentNotes) => [newNote, ...currentNotes])
    setSelectedNote(newNote)
    setActiveView('Notes')
  }

  function updateNote(noteId: number, changes: Pick<Note, 'title' | 'preview'>): void {
    setNotes((currentNotes) => currentNotes.map((note) => note.id === noteId ? { ...note, ...changes, updated: 'Just now' } : note))
    setSelectedNote((currentNote) => currentNote && currentNote.id === noteId ? { ...currentNote, ...changes, updated: 'Just now' } : currentNote)
  }

  function trashNote(noteId: number): void {
    setNotes((currentNotes) => moveNoteToTrash(currentNotes, noteId, new Date().toISOString()))
    setSelectedNote((currentNote) => currentNote?.id === noteId ? null : currentNote)
  }

  function restoreNote(noteId: number): void {
    setNotes((currentNotes) => restoreNoteFromTrash(currentNotes, noteId))
  }

  function deleteNotePermanently(noteId: number): void {
    setNotes((currentNotes) => permanentlyDeleteNote(currentNotes, noteId))
  }

  function chooseView(view: WorkspaceView): void {
    setActiveView(view)
    setIsSidebarOpen(false)
    setSelectedNote(null)
  }

  return <div className="min-h-screen bg-ink text-cream md:flex">
    <button className={`${iconButtonClassName} fixed top-5 left-4 z-30 bg-surface md:hidden`} aria-label={t("Open navigation")} onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
    <Sidebar account={account} onSignOut={() => { void account.onSignOut().catch((error: unknown) => setAccountError(accountErrorMessage(error))) }} activeView={activeView} activeNoteCount={activeNotes.length} itemCount={scheduleProgress.total} isOpen={isSidebarOpen} onCreateNote={createNote} onSelectView={chooseView} trashCount={trashedNotes.length} />
    {isSidebarOpen && <button className="fixed inset-0 z-30 bg-black/50 md:hidden" aria-label={t("Close navigation")} onClick={() => setIsSidebarOpen(false)} />}
    <main className="min-w-0 flex-1 px-4 pb-10 md:px-6 lg:px-13 lg:pb-16">
      <Topbar displayName={account.displayName} activeView={activeView} searchTerm={searchTerm} onSearchChange={setSearchTerm} timeLabel={localClock.timeLabel} timeZoneLabel={localClock.timeZoneLabel} />
      {accountError && <p className="feature-error" role="alert">{t(accountError)}</p>}
      {(!agendaSaved || !notesSaved) && <p className="feature-error" role="alert">{t("Browser storage is unavailable. Your latest changes are kept only for this session.")}</p>}
      {activeView === 'Explore' && <Suspense fallback={<p role="status">{t("Opening event discovery…")}</p>}><EventsView userId={account.userId} preferences={account.preferences} onEditPreferences={account.onEditPreferences} onAddToAgenda={addDiscoveredEvent} agendaEventIds={items.flatMap((item) => item.eventId ? [item.eventId] : [])} /></Suspense>}
      {activeView === 'Today' && <TodayView displayName={account.displayName} activeNotes={activeNotes} currentDate={selectedDate} dateLabel={getLocalClockSnapshot(selectedDate, locale).dateLabel} greeting={getGreetingForHour(localClock.hour)} items={visibleItems} allItems={dayItems} progress={scheduleProgress} onToggle={toggleItem} onRemove={removeScheduleItem} onSelectDate={setSelectedDate} onAddItem={createScheduleItem} onCreateNote={createNote} onOpenNotes={() => chooseView('Notes')} />}
      {activeView === 'Notes' && <NotesView notes={activeNotes} selectedNote={selectedNote} onCreate={createNote} onMoveToTrash={trashNote} onSelect={setSelectedNote} onUpdate={updateNote} />}
      {activeView === 'Trash' && <TrashView notes={trashedNotes} onDeletePermanently={deleteNotePermanently} onRestore={restoreNote} />}
    </main>
  </div>
}

