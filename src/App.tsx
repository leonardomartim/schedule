import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CirclePlus, Clock3, Menu, MoreHorizontal, NotebookPen, PanelLeft, RotateCcw, Search, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import { createAgendaStacks, getScheduleProgress, type ScheduleProgress } from './agenda-stacks'
import { getScheduleCategoryPresentation } from './agenda-presentation'
import { getGreetingForHour } from './greeting'
import { getLocalClockSnapshot } from './local-clock'
import { moveNoteToTrash, restoreNoteFromTrash } from './note-lifecycle'
import { loadNotes, loadScheduleItems, saveNotes, saveScheduleItems } from './schedule-storage'
import type { Note, ScheduleCategory, ScheduleItem } from './types'

type WorkspaceView = 'Today' | 'Notes' | 'Trash'

const inputClassName = 'w-full rounded border border-line bg-ink px-3 py-2.5 text-[13px] text-cream outline-none transition focus:border-orange'
const iconButtonClassName = 'grid size-8 place-items-center rounded text-muted transition hover:bg-surface-raised hover:text-cream'
const noteSurfaceClassNames: Record<Note['accent'], string> = {
  orange: 'bg-note-cream text-note-ink',
  blue: 'bg-note-blue text-note-blue-ink',
  cream: 'bg-note-cream text-note-ink',
}

export function App(): ReactNode {
  const [activeView, setActiveView] = useState<WorkspaceView>('Today')
  const [items, setItems] = useState<ScheduleItem[]>(loadScheduleItems)
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const activeNotes = useMemo(() => notes.filter((note) => !note.deletedAt), [notes])
  const trashedNotes = useMemo(() => notes.filter((note) => note.deletedAt), [notes])
  const scheduleProgress = useMemo(() => getScheduleProgress(items), [items])
  const visibleItems = useMemo(() => items.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm])
  const localClock = useMemo(() => getLocalClockSnapshot(currentDate), [currentDate])

  useEffect(() => { saveScheduleItems(items) }, [items])
  useEffect(() => { saveNotes(notes) }, [notes])
  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentDate(new Date()), 30_000)
    return () => window.clearInterval(clockInterval)
  }, [])

  function toggleItem(id: number): void {
    setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  function createScheduleItem(item: Omit<ScheduleItem, 'id' | 'completed'>): void {
    setItems((currentItems) => [...currentItems, { ...item, id: Date.now(), completed: false }])
  }

  function createNote(): void {
    const newNote: Note = { id: Date.now(), title: 'Untitled note', preview: 'Start writing something down...', updated: 'Just now', accent: 'orange' }
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

  function chooseView(view: WorkspaceView): void {
    setActiveView(view)
    setIsSidebarOpen(false)
    setSelectedNote(null)
  }

  return <div className="min-h-screen bg-ink text-cream md:flex">
    <button className={`${iconButtonClassName} fixed top-5 left-4 z-30 bg-surface md:hidden`} aria-label="Open navigation" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
    <Sidebar activeView={activeView} activeNoteCount={activeNotes.length} itemCount={scheduleProgress.total} isOpen={isSidebarOpen} onCreateNote={createNote} onSelectView={chooseView} trashCount={trashedNotes.length} />
    {isSidebarOpen && <button className="fixed inset-0 z-30 bg-black/50 md:hidden" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} />}
    <main className="min-w-0 flex-1 px-4 pb-10 md:px-6 lg:px-13 lg:pb-16">
      <Topbar activeView={activeView} searchTerm={searchTerm} onSearchChange={setSearchTerm} timeLabel={localClock.timeLabel} timeZoneLabel={localClock.timeZoneLabel} />
      {activeView === 'Today' && <TodayView activeNotes={activeNotes} currentDate={currentDate} dateLabel={localClock.dateLabel} greeting={getGreetingForHour(localClock.hour)} items={visibleItems} allItems={items} progress={scheduleProgress} onToggle={toggleItem} onAddItem={createScheduleItem} onCreateNote={createNote} />}
      {activeView === 'Notes' && <NotesView notes={activeNotes} selectedNote={selectedNote} onCreate={createNote} onMoveToTrash={trashNote} onSelect={setSelectedNote} onUpdate={updateNote} />}
      {activeView === 'Trash' && <TrashView notes={trashedNotes} onRestore={restoreNote} />}
    </main>
  </div>
}

function Sidebar({ activeNoteCount, activeView, isOpen, itemCount, onCreateNote, onSelectView, trashCount }: { activeNoteCount: number; activeView: WorkspaceView; isOpen: boolean; itemCount: number; onCreateNote: () => void; onSelectView: (view: WorkspaceView) => void; trashCount: number }): ReactNode {
  const navigationItems = [{ label: 'Today' as const, icon: CalendarDays, count: itemCount }, { label: 'Notes' as const, icon: NotebookPen, count: activeNoteCount }, { label: 'Trash' as const, icon: Trash2, count: trashCount }]
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-62.5 -translate-x-full flex-col border-r border-line bg-ink/95 px-4 pt-7 pb-5 shadow-[15px_0_50px_rgba(0,0,0,.35)] backdrop-blur transition-transform md:static md:translate-x-0 md:shadow-none ${isOpen ? 'translate-x-0' : ''}`}>
    <div className="flex items-center justify-between px-3 pb-8"><a className="flex items-center gap-2.5 text-base font-bold tracking-[-.4px]" href="."><span className="grid size-7 place-items-center rounded-lg bg-orange font-display text-lg font-bold text-ink">S</span><span>schedule</span></a><button className={`${iconButtonClassName} md:hidden`} aria-label="Close navigation" onClick={() => onSelectView(activeView)}><X size={18} /></button></div>
    <button className="flex w-full items-center gap-2.5 rounded-md border border-line bg-surface-raised px-3 py-3 text-left text-sm font-semibold transition hover:border-muted" onClick={onCreateNote}><CirclePlus className="text-orange" size={18} /> New note <span className="ml-auto text-[11px] font-normal text-muted">⌘ N</span></button>
    <nav className="mt-10" aria-label="Main navigation"><p className="mb-3 px-3 text-[10px] font-bold tracking-[.18em] text-muted uppercase">Workspace</p>{navigationItems.map(({ label, icon: Icon, count }) => <button className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${activeView === label ? 'bg-surface-raised text-cream' : 'text-muted hover:bg-surface hover:text-cream'}`} key={label} onClick={() => onSelectView(label)}><Icon className={activeView === label ? 'text-orange' : ''} size={18} /><span>{label}</span><span className="ml-auto text-xs text-muted">{count}</span></button>)}</nav>
    <div className="mt-auto"><div className="mb-5 flex gap-2.5 rounded-lg bg-surface px-3 py-3"><span className="grid size-7 place-items-center rounded-full bg-orange text-ink"><Sparkles size={16} /></span><div><strong className="block text-xs">3 day streak</strong><span className="text-[11px] text-muted">Keep showing up.</span></div></div><button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-cream"><Settings2 size={18} /> Settings</button><div className="mt-2 flex items-center gap-2.5 border-t border-line px-2 pt-4"><Avatar /><div><strong className="block text-xs">Jordan Davis</strong><span className="text-[11px] text-muted">Personal space</span></div><MoreHorizontal className="ml-auto text-muted" size={17} /></div></div>
  </aside>
}

function Topbar({ activeView, onSearchChange, searchTerm, timeLabel, timeZoneLabel }: { activeView: WorkspaceView; onSearchChange: (value: string) => void; searchTerm: string; timeLabel: string; timeZoneLabel: string }): ReactNode {
  return <header className="flex h-18 items-center justify-between border-b border-line pl-12 md:h-20 md:pl-0"><div className="flex items-center gap-2.5 text-xs text-muted"><span>Workspace</span><span>/</span><strong className="font-medium text-cream">{activeView}</strong></div><div className="flex items-center gap-3"><time className="hidden text-xs text-muted lg:block" title={timeZoneLabel}>{timeLabel} · {timeZoneLabel}</time><label className="flex w-8 items-center gap-2 rounded border border-transparent p-2 text-muted transition focus-within:w-55 focus-within:border-line focus-within:bg-surface md:w-55"><Search size={17} /><input className="min-w-0 flex-1 bg-transparent text-xs text-cream outline-none placeholder:text-muted" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search your day" /><kbd className="hidden text-[10px] md:block">⌘ K</kbd></label><button className={`${iconButtonClassName} hidden md:grid`} aria-label="Toggle panel"><PanelLeft size={18} /></button><Avatar small /></div></header>
}

interface TodayViewProps { activeNotes: Note[]; allItems: ScheduleItem[]; currentDate: Date; dateLabel: string; greeting: string; items: ScheduleItem[]; progress: ScheduleProgress; onToggle: (id: number) => void; onAddItem: (item: Omit<ScheduleItem, 'id' | 'completed'>) => void; onCreateNote: () => void }

function TodayView({ activeNotes, allItems, currentDate, dateLabel, greeting, items, progress, onToggle, onAddItem, onCreateNote }: TodayViewProps): ReactNode {
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const agendaStacks = useMemo(() => createAgendaStacks(items), [items])
  const nextItem = allItems.filter((item) => !item.completed).sort((firstItem, secondItem) => firstItem.time.localeCompare(secondItem.time))[0]
  const dateCells = useMemo(() => getDateStripCells(currentDate), [currentDate])
  const addAgendaItem = (item: Omit<ScheduleItem, 'id' | 'completed'>): void => { onAddItem(item); setIsComposerOpen(false) }

  return <><section className="mx-auto mt-10 mb-7 flex max-w-[1190px] flex-col gap-6 md:mt-15 md:mb-9 md:flex-row md:items-end md:justify-between"><div><p className="mb-3 text-[10px] font-bold tracking-[.18em] text-orange uppercase">{dateLabel}</p><h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{greeting}, Jordan<span className="text-orange">.</span></h1><p className="mt-4 text-[13px] text-muted">A clear day is a kind of freedom.</p></div><button className="flex items-center gap-2 rounded border border-line bg-surface px-3 py-2.5 text-xs transition hover:border-muted"><CalendarDays className="text-orange" size={17} /> Today <ChevronRight className="rotate-90 text-muted" size={16} /></button></section><div className="mx-auto mb-8 flex max-w-[1190px] items-center gap-1 border-b border-line p-1 md:mb-11"><button className={`${iconButtonClassName} rounded-full`} aria-label="Previous days"><ChevronLeft size={17} /></button>{dateCells.map((cell) => <DateCell active={cell.active} date={cell.date} day={cell.day} key={cell.key} />)}<button className={`${iconButtonClassName} rounded-full`} aria-label="Next days"><ChevronRight size={17} /></button></div><div className="mx-auto grid max-w-[1190px] gap-11 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,.8fr)] lg:gap-14"><section><div className="flex items-start justify-between gap-5"><div><h2 className="mb-1.5 text-base font-semibold">Agenda stacks</h2><span className="text-[11px] text-muted">{progress.completed} of {progress.total} complete</span></div><button className="flex items-center gap-1.5 bg-transparent text-xs text-orange transition hover:text-orange/80" onClick={() => setIsComposerOpen((isOpen) => !isOpen)}><CirclePlus size={16} /> Add to day</button></div><div className="my-5 h-0.75 overflow-hidden rounded bg-line" role="progressbar" aria-label="Daily agenda progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}><span className="block h-full rounded bg-orange transition-[width]" style={{ width: `${progress.percentage}%` }} /></div>{nextItem && <div className="mb-7 grid gap-1 border-l-2 border-orange bg-orange/8 px-4 py-3"><span className="text-[11px] text-muted">Next up · {nextItem.time}</span><strong className="font-display text-xl font-normal">{nextItem.title}</strong><p className="m-0 text-[11px] text-muted">{nextItem.detail}</p></div>}{isComposerOpen && <AgendaComposer onAdd={addAgendaItem} onCancel={() => setIsComposerOpen(false)} />}<div>{agendaStacks.map((stack, index) => <section className={index === 0 ? '' : 'mt-7'} key={stack.id}><header className="mb-2 flex items-center justify-between border-b border-line pb-2"><h3 className="font-display text-xl font-normal">{stack.label}</h3><span className="text-[11px] text-muted">{stack.items.length} {stack.items.length === 1 ? 'item' : 'items'}</span></header>{stack.items.map((item, itemIndex) => <AgendaItemCard item={item} isFirst={itemIndex === 0} isLast={itemIndex === stack.items.length - 1} key={item.id} onToggle={onToggle} />)}</section>)}</div>{agendaStacks.length === 0 && <div className="grid min-h-45 place-items-center gap-2 text-center text-muted"><Clock3 size={24} /><p className="m-0 text-[13px]">No agenda items match this search.</p></div>}</section><aside><div className="flex items-start justify-between gap-5"><div><h2 className="mb-1.5 text-base font-semibold">Quick notes</h2><span className="text-[11px] text-muted">A place for loose thoughts</span></div><button className={iconButtonClassName} onClick={onCreateNote} aria-label="Create note"><CirclePlus size={18} /></button></div><div className="mt-6 grid gap-3">{activeNotes.slice(0, 2).map((note) => <NoteCard key={note.id} note={note} />)}</div><button className="mt-5 flex items-center gap-1.5 bg-transparent text-xs text-muted transition hover:text-cream" onClick={onCreateNote}>Open notes <ChevronRight size={15} /></button></aside></div></>
}

function AgendaComposer({ onAdd, onCancel }: { onAdd: (item: Omit<ScheduleItem, 'id' | 'completed'>) => void; onCancel: () => void }): ReactNode {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [detail, setDetail] = useState('')
  const [duration, setDuration] = useState('30 min')
  const [category, setCategory] = useState<ScheduleCategory>('focus')
  function submitAgendaItem(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); const cleanTitle = title.trim(); if (cleanTitle) onAdd({ title: cleanTitle, time, detail: detail.trim() || 'No additional details', duration, category }) }
  return <form className="mb-7 grid gap-3 rounded-lg border border-orange/30 bg-surface p-4" onSubmit={submitAgendaItem}><div className="flex items-center justify-between"><h3 className="font-display text-xl font-normal">Add to today</h3><button type="button" className={iconButtonClassName} aria-label="Close agenda composer" onClick={onCancel}><X size={16} /></button></div><Field label="What needs your attention?"><input autoFocus className={inputClassName} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name the commitment" /></Field><div className="grid gap-3 sm:grid-cols-3"><Field label="Time"><input className={inputClassName} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field><Field label="Duration"><input className={inputClassName} value={duration} onChange={(event) => setDuration(event.target.value)} /></Field><Field label="Stack"><select className={inputClassName} value={category} onChange={(event) => setCategory(event.target.value as ScheduleCategory)}>{(['work', 'personal', 'focus', 'health'] as ScheduleCategory[]).map((value) => <option key={value} value={value}>{getScheduleCategoryPresentation(value).label}</option>)}</select></Field></div><Field label="Detail"><input className={inputClassName} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Optional context" /></Field><div className="flex justify-end gap-3"><button type="button" className="rounded px-3 py-2 text-xs text-muted transition hover:text-cream" onClick={onCancel}>Cancel</button><button type="submit" className="rounded bg-orange px-3 py-2 text-xs font-bold text-ink transition hover:bg-orange/85">Add to agenda</button></div></form>
}

function AgendaItemCard({ item, isFirst, isLast, onToggle }: { item: ScheduleItem; isFirst: boolean; isLast: boolean; onToggle: (id: number) => void }): ReactNode {
  const presentation = getScheduleCategoryPresentation(item.category)
  return <article className={`grid min-h-22 grid-cols-[2.75rem_1.375rem_minmax(0,1fr)] ${item.completed ? 'opacity-55' : ''}`}><time className="pt-4 text-[11px] text-muted">{item.time}</time><div className="relative flex justify-center"><span className={`absolute top-0 bottom-0 w-px bg-line ${isFirst ? 'top-5' : ''} ${isLast ? 'bottom-[calc(100%-1.25rem)]' : ''}`} /><span className={`z-10 mt-4 size-2 rounded-full ring-1 ring-ink ${presentation.dotClassName}`} /></div><div className="my-1 mr-0 mb-2 ml-3 flex min-w-0 items-center justify-between gap-4 rounded-md border border-line bg-surface p-3.5 transition hover:border-muted hover:bg-surface-raised"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className={`m-0 text-[13px] font-semibold ${item.completed ? 'line-through decoration-muted' : ''}`}>{item.title}</h3><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${presentation.badgeClassName}`}>{presentation.label}</span></div><p className="mt-1 mb-2 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{item.detail}</p><span className="flex items-center gap-1 text-[10px] text-muted"><Clock3 size={13} /> {item.duration}</span></div><button className={`grid size-5 shrink-0 place-items-center rounded-full border ${item.completed ? 'border-orange bg-orange text-ink' : 'border-muted bg-transparent'}`} onClick={() => onToggle(item.id)} aria-label={`${item.completed ? 'Uncomplete' : 'Complete'} ${item.title}`}>{item.completed && <Check size={15} />}</button></div></article>
}

function NotesView({ notes, selectedNote, onCreate, onMoveToTrash, onSelect, onUpdate }: { notes: Note[]; selectedNote: Note | null; onCreate: () => void; onMoveToTrash: (noteId: number) => void; onSelect: (note: Note) => void; onUpdate: (noteId: number, changes: Pick<Note, 'title' | 'preview'>) => void }): ReactNode {
  return <section className="mx-auto max-w-[1190px]"><PageHeading kicker="Your thinking space" title="Notes" onAction={onCreate} actionLabel="New note" /><div className="grid min-h-105 border-y border-line lg:grid-cols-[20.625rem_minmax(0,1fr)]"><NoteList notes={notes} selectedNote={selectedNote} onSelect={onSelect} /><div className="flex min-h-87.5 flex-col p-7 sm:p-10 lg:p-12">{selectedNote ? <><div className="mb-6 flex items-start gap-4"><input className="min-w-0 flex-1 border-0 bg-transparent font-display text-3xl text-cream outline-none" value={selectedNote.title} onChange={(event) => onUpdate(selectedNote.id, { title: event.target.value, preview: selectedNote.preview })} aria-label="Note title" /><button className={`${iconButtonClassName} hover:text-orange`} onClick={() => onMoveToTrash(selectedNote.id)} aria-label="Move note to trash"><Trash2 size={17} /></button></div><textarea className="min-h-62.5 flex-1 resize-none border-0 bg-transparent text-sm leading-7 text-muted outline-none" value={selectedNote.preview} onChange={(event) => onUpdate(selectedNote.id, { title: selectedNote.title, preview: event.target.value })} aria-label="Note content" /><span className="mt-4 text-[10px] text-muted/70">Saved on this device · {selectedNote.updated}</span></> : <EmptyNotesEditor />}</div></div></section>
}

function TrashView({ notes, onRestore }: { notes: Note[]; onRestore: (noteId: number) => void }): ReactNode {
  return <section className="mx-auto max-w-[1190px]"><PageHeading kicker="Recoverable notes" title="Trash" /><div className="border-y border-line py-3">{notes.length === 0 ? <div className="grid min-h-70 place-items-center text-center text-muted"><div><Trash2 className="mx-auto mb-3 text-orange" size={28} /><p className="m-0 text-sm">Trash is empty.</p></div></div> : notes.map((note) => <article className="flex items-center justify-between gap-4 border-b border-line px-3 py-4 last:border-b-0" key={note.id}><div className="min-w-0"><strong className="block text-[13px] font-semibold">{note.title}</strong><p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{note.preview}</p></div><button className="flex shrink-0 items-center gap-2 rounded border border-line px-3 py-2 text-xs text-cream transition hover:border-orange" onClick={() => onRestore(note.id)}><RotateCcw size={15} /> Restore</button></article>)}</div></section>
}

function PageHeading({ actionLabel, kicker, onAction, title }: { actionLabel?: string; kicker: string; onAction?: () => void; title: string }): ReactNode { return <div className="mt-10 mb-7 flex flex-col gap-6 md:mt-15 md:mb-11 md:flex-row md:items-end md:justify-between"><div><p className="mb-3 text-[10px] font-bold tracking-[.18em] text-orange uppercase">{kicker}</p><h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{title}<span className="text-orange">.</span></h1><p className="mt-4 text-[13px] text-muted">{title === 'Trash' ? 'Notes stay here until you restore them.' : 'Keep the good ideas close.'}</p></div>{onAction && <button className="flex items-center gap-2 rounded border border-line bg-surface px-3 py-2.5 text-xs transition hover:border-muted" onClick={onAction}><CirclePlus className="text-orange" size={17} /> {actionLabel}</button>}</div> }
function NoteList({ notes, onSelect, selectedNote }: { notes: Note[]; onSelect: (note: Note) => void; selectedNote: Note | null }): ReactNode { return <div className="border-b border-line py-3 lg:mr-6 lg:border-r lg:border-b-0 lg:pr-6">{notes.map((note) => <button className={`flex w-full gap-3 rounded px-3 py-4 text-left transition ${selectedNote?.id === note.id ? 'bg-surface' : 'hover:bg-surface'}`} onClick={() => onSelect(note)} key={note.id}><span className={`mt-1.25 size-2 shrink-0 rounded-full ${note.accent === 'blue' ? 'bg-sky' : note.accent === 'orange' ? 'bg-orange' : 'bg-note-cream'}`} /><span className="min-w-0"><strong className="mb-1.5 block text-[13px] font-semibold">{note.title}</strong><small className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{note.preview}</small><em className="mt-2 block text-[10px] not-italic text-muted/70">{note.updated}</em></span></button>)}</div> }
function EmptyNotesEditor(): ReactNode { return <div className="m-auto text-center text-muted"><NotebookPen className="mx-auto text-orange" size={28} /><h2 className="mt-4 mb-1 font-display text-2xl text-cream">Pick a note to begin</h2><p className="text-xs">Capture the thought before it drifts.</p></div> }
function NoteCard({ note }: { note: Note }): ReactNode { return <div className={`relative min-h-31.5 overflow-hidden rounded-lg p-5 ${noteSurfaceClassNames[note.accent]}`}><span className="mb-5 block size-2 rounded-full bg-current opacity-60" /><h3 className="mb-2 font-display text-lg">{note.title}</h3><p className="max-w-55 text-[11px] leading-relaxed opacity-75">{note.preview}</p><span className="absolute top-4 right-4 text-lg">↗</span><span className="absolute -right-8 -bottom-11 size-32 rounded-full border border-current opacity-20" /></div> }
function DateCell({ active, date, day }: { active: boolean; date: string; day: string }): ReactNode { return <div className={`relative flex flex-1 flex-col items-center gap-1.5 py-1.5 pb-3.5 text-[11px] ${active ? 'text-orange' : 'text-muted'}`}><span>{day}</span><strong className={`text-[15px] font-medium ${active ? 'text-cream' : 'text-cream/75'}`}>{date}</strong>{active && <i className="absolute -bottom-1.5 size-1.5 rounded-full bg-orange" />}</div> }
function Field({ label, children }: { label: string; children: ReactNode }): ReactNode { return <label className="grid gap-1.5 text-[11px] text-muted"><span>{label}</span>{children}</label> }
function Avatar({ small = false }: { small?: boolean }): ReactNode { return <div className={`grid place-items-center rounded-full bg-sky text-[10px] font-bold text-ink ${small ? 'size-7.5' : 'size-8'}`}>JD</div> }
function getDateStripCells(currentDate: Date): { active: boolean; date: string; day: string; key: string }[] { return [-2, -1, 0, 1, 2].map((offset) => { const date = new Date(currentDate); date.setDate(currentDate.getDate() + offset); return { active: offset === 0, date: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date), day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date), key: date.toISOString() } }) }
