import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CirclePlus, Clock3, Menu, MoreHorizontal, NotebookPen, PanelLeft, Search, Settings2, Sparkles, X } from 'lucide-react'
import { notes as initialNotes, scheduleItems } from './data'
import type { Note, ScheduleCategory } from './types'

const navItems = [
  { label: 'Today', icon: CalendarDays, count: '6' },
  { label: 'Notes', icon: NotebookPen, count: '3' },
]

const categoryLabels: Record<ScheduleCategory, string> = { work: 'Work', personal: 'Personal', focus: 'Focus', health: 'Health' }

export function App(): ReactNode {
  const [activeNav, setActiveNav] = useState('Today')
  const [items, setItems] = useState(scheduleItems)
  const [notes, setNotes] = useState(initialNotes)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)

  const visibleItems = useMemo(() => items.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm])
  const completedCount = items.filter((item) => item.completed).length

  function toggleItem(id: number): void {
    setItems((current) => current.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  function createNote(): void {
    const newNote: Note = { id: Date.now(), title: 'Untitled note', preview: 'Start writing something down...', updated: 'Just now', accent: 'orange' }
    setNotes((current) => [newNote, ...current])
    setSelectedNote(newNote)
    setActiveNav('Notes')
  }

  function updateNote(noteId: number, changes: Pick<Note, 'title' | 'preview'>): void {
    setNotes((current) => current.map((note) => note.id === noteId ? { ...note, ...changes, updated: 'Just now' } : note))
    setSelectedNote((current) => current && current.id === noteId ? { ...current, ...changes, updated: 'Just now' } : current)
  }

  return (
    <div className="app-shell">
      <button className="mobile-menu" aria-label="Open navigation" onClick={() => setShowSidebar(true)}><Menu size={20} /></button>
      <aside className={`sidebar ${showSidebar ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline">
          <a className="brand" href="."><span className="brand-mark">S</span><span>schedule</span></a>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setShowSidebar(false)}><X size={18} /></button>
        </div>
        <button className="new-button" onClick={createNote}><CirclePlus size={18} /> New note <span className="shortcut">⌘ N</span></button>
        <nav className="main-nav" aria-label="Main navigation">
          <p className="eyebrow">Workspace</p>
          {navItems.map(({ label, icon: Icon, count }) => <button className={`nav-item ${activeNav === label ? 'nav-item-active' : ''}`} key={label} onClick={() => { setActiveNav(label); setShowSidebar(false) }}><Icon size={18} /><span>{label}</span><span className="nav-count">{label === 'Today' ? completedCount : notes.length}</span></button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card"><div className="streak-icon"><Sparkles size={16} /></div><div><strong>3 day streak</strong><span>Keep showing up.</span></div></div>
          <button className="nav-item"><Settings2 size={18} /><span>Settings</span></button>
          <div className="profile"><div className="avatar">JD</div><div><strong>Jordan Davis</strong><span>Personal space</span></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>
      {showSidebar && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setShowSidebar(false)} />}

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><label className="search-box"><Search size={17} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search your day" /><kbd>⌘ K</kbd></label><button className="icon-button"><PanelLeft size={18} /></button><div className="avatar avatar-small">JD</div></div></header>
        {activeNav === 'Today' ? <TodayView items={visibleItems} completedCount={completedCount} onToggle={toggleItem} onCreateNote={createNote} /> : <NotesView notes={notes} selectedNote={selectedNote} onSelect={setSelectedNote} onCreate={createNote} onUpdate={updateNote} />}
      </main>
    </div>
  )
}

function TodayView({ items, completedCount, onToggle, onCreateNote }: { items: typeof scheduleItems; completedCount: number; onToggle: (id: number) => void; onCreateNote: () => void }): ReactNode {
  return <>
    <section className="page-heading"><div><p className="kicker">Tuesday, March 18, 2025</p><h1>Good morning, Jordan<span className="orange-dot">.</span></h1><p className="subheading">A clear day is a kind of freedom.</p></div><button className="date-button"><CalendarDays size={17} /> Today <ChevronDownIcon /></button></section>
    <div className="date-strip"><button className="circle-button"><ChevronLeft size={17} /></button><div className="date-cell"><span>Mon</span><strong>17</strong></div><div className="date-cell date-cell-active"><span>Tue</span><strong>18</strong><i /></div><div className="date-cell"><span>Wed</span><strong>19</strong></div><div className="date-cell"><span>Thu</span><strong>20</strong></div><div className="date-cell"><span>Fri</span><strong>21</strong></div><button className="circle-button"><ChevronRight size={17} /></button></div>
    <div className="content-grid"><section className="schedule-panel"><div className="section-header"><div><h2>Today&apos;s schedule</h2><span className="muted-label">{completedCount} of {items.length} complete</span></div><button className="text-button" onClick={onCreateNote}><CirclePlus size={16} /> Add to day</button></div><div className="progress-track"><span style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }} /></div><div className="timeline">{items.map((item) => <article className={`timeline-row ${item.completed ? 'timeline-row-complete' : ''}`} key={item.id}><time>{item.time}</time><div className="timeline-line"><span className={`timeline-dot dot-${item.category}`} /></div><div className="schedule-card"><div className="schedule-card-content"><div className="schedule-title-row"><h3>{item.title}</h3><span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span></div><p>{item.detail}</p><span className="duration"><Clock3 size={13} /> {item.duration}</span></div><button className={`complete-button ${item.completed ? 'complete-button-checked' : ''}`} onClick={() => onToggle(item.id)} aria-label={`${item.completed ? 'Uncomplete' : 'Complete'} ${item.title}`}>{item.completed && <Check size={15} />}</button></div></article>)}</div></section><aside className="notes-panel"><div className="section-header"><div><h2>Quick notes</h2><span className="muted-label">A place for loose thoughts</span></div><button className="icon-button" onClick={onCreateNote} aria-label="Create note"><CirclePlus size={18} /></button></div><div className="notes-stack"><NoteCard title="A small intention" text="Move slowly enough to notice what is happening." accent="cream" /><NoteCard title="Before the call" text="What does a useful next step look like?" accent="blue" /></div><button className="all-notes-button" onClick={onCreateNote}>Open notes <ChevronRight size={15} /></button></aside></div>
  </>
}

function NotesView({ notes, selectedNote, onSelect, onCreate, onUpdate }: { notes: Note[]; selectedNote: Note | null; onSelect: (note: Note) => void; onCreate: () => void; onUpdate: (noteId: number, changes: Pick<Note, 'title' | 'preview'>) => void }): ReactNode {
  return <section className="notes-view"><div className="page-heading notes-heading"><div><p className="kicker">Your thinking space</p><h1>Notes<span className="orange-dot">.</span></h1><p className="subheading">Keep the good ideas close.</p></div><button className="date-button" onClick={onCreate}><CirclePlus size={17} /> New note</button></div><div className="notes-layout"><div className="note-list">{notes.map((note) => <button className={`note-list-item ${selectedNote?.id === note.id ? 'note-list-item-active' : ''}`} onClick={() => onSelect(note)} key={note.id}><span className={`note-swatch swatch-${note.accent}`} /><span><strong>{note.title}</strong><small>{note.preview}</small><em>{note.updated}</em></span></button>)}</div><div className="note-editor">{selectedNote ? <><input className="note-title-input" value={selectedNote.title} onChange={(event) => onUpdate(selectedNote.id, { title: event.target.value, preview: selectedNote.preview })} aria-label="Note title" /><textarea value={selectedNote.preview} onChange={(event) => onUpdate(selectedNote.id, { title: selectedNote.title, preview: event.target.value })} aria-label="Note content" /><span className="editor-status">Saved locally · {selectedNote.updated}</span></> : <div className="empty-editor"><NotebookPen size={28} /><h2>Pick a note to begin</h2><p>Capture the thought before it drifts.</p></div>}</div></div></section>
}

function NoteCard({ title, text, accent }: { title: string; text: string; accent: Note['accent'] }): ReactNode { return <div className={`quick-note quick-note-${accent}`}><span className="note-swatch" /><h3>{title}</h3><p>{text}</p><span className="note-arrow">↗</span></div> }
function ChevronDownIcon(): ReactNode { return <ChevronRight size={16} className="chevron-down" /> }
