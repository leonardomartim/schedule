import { usePresentation } from '../presentation/PresentationProvider'
import { useState, type ReactNode } from 'react'
import { CirclePlus, NotebookPen, RotateCcw, Trash2 } from 'lucide-react'
import type { Note } from '../types'
import { iconButtonClassName } from './WorkspacePrimitives'

export function NotesView({ notes, selectedNote, onCreate, onMoveToTrash, onSelect, onUpdate }: { notes: Note[]; selectedNote: Note | null; onCreate: () => void; onMoveToTrash: (noteId: number) => void; onSelect: (note: Note) => void; onUpdate: (noteId: number, changes: Pick<Note, 'title' | 'preview'>) => void }): ReactNode {
  const { t } = usePresentation()

  return <section className="mx-auto max-w-[1190px]"><PageHeading kicker={t("Your thinking space")} title={t("Notes")} onAction={onCreate} actionLabel={t("New note")} /><div className="grid min-h-105 border-y border-line lg:grid-cols-[20.625rem_minmax(0,1fr)]"><NoteList notes={notes} selectedNote={selectedNote} onSelect={onSelect} /><div className="flex min-h-87.5 flex-col p-7 sm:p-10 lg:p-12">{selectedNote ? <><div className="mb-6 flex items-start gap-4"><input className="min-w-0 flex-1 border-0 bg-transparent font-display text-3xl text-cream outline-none" value={selectedNote.title} onChange={(event) => onUpdate(selectedNote.id, { title: event.target.value, preview: selectedNote.preview })} aria-label={t("Note title")} /><button className={`${iconButtonClassName} hover:text-orange`} onClick={() => onMoveToTrash(selectedNote.id)} aria-label={t("Move note to trash")}><Trash2 size={17} /></button></div><textarea className="min-h-62.5 flex-1 resize-none border-0 bg-transparent text-sm leading-7 text-muted outline-none" value={selectedNote.preview} onChange={(event) => onUpdate(selectedNote.id, { title: selectedNote.title, preview: event.target.value })} aria-label={t("Note content")} /><span className="mt-4 text-[10px] text-muted/70">{t('Saved on this device')} · {t(selectedNote.updated)}</span></> : <EmptyNotesEditor />}</div></div></section>
}

export function TrashView({ notes, onDeletePermanently, onRestore }: { notes: Note[]; onDeletePermanently: (noteId: number) => void; onRestore: (noteId: number) => void }): ReactNode {
  const { t } = usePresentation()

  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<Note | null>(null)

  return <section className="mx-auto max-w-[1190px]">
    <PageHeading kicker={t("Recoverable notes")} title={t("Trash")} />
    <div className="border-y border-line py-3">
      {notes.length === 0 ? <div className="grid min-h-70 place-items-center text-center text-muted"><div><Trash2 className="mx-auto mb-3 text-orange" size={28} /><p className="m-0 text-sm">{t("Trash is empty.")}</p></div></div> : notes.map((note) => <article className="flex items-center justify-between gap-4 border-b border-line px-3 py-4 last:border-b-0" key={note.id}><div className="min-w-0"><strong className="block text-[13px] font-semibold">{note.title}</strong><p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{note.preview}</p></div><div className="flex shrink-0 gap-2"><button className="flex items-center gap-2 rounded border border-line px-3 py-2 text-xs text-cream transition hover:border-orange" onClick={() => onRestore(note.id)}><RotateCcw size={15} /> {t("Restore")}</button><button className="flex items-center gap-2 rounded border border-line px-3 py-2 text-xs text-muted transition hover:border-orange hover:text-orange" onClick={() => setPendingPermanentDelete(note)}><Trash2 size={15} /> {t("Delete permanently")}</button></div></article>)}
    </div>
    {pendingPermanentDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="permanent-delete-title"><div className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-2xl"><h2 className="font-display text-2xl" id="permanent-delete-title">{t("Delete permanently?")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t('“{title}” cannot be recovered after this action.', { title: pendingPermanentDelete.title })}</p><div className="mt-6 flex justify-end gap-3"><button className="rounded px-3 py-2 text-xs text-muted transition hover:text-cream" onClick={() => setPendingPermanentDelete(null)}>{t("Cancel")}</button><button className="rounded bg-orange px-3 py-2 text-xs font-bold text-ink transition hover:bg-orange/85" onClick={() => { onDeletePermanently(pendingPermanentDelete.id); setPendingPermanentDelete(null) }}>{t("Delete permanently")}</button></div></div></div>}
  </section>
}

function PageHeading({ actionLabel, kicker, onAction, title }: { actionLabel?: string; kicker: string; onAction?: () => void; title: string }): ReactNode {
  const { t } = usePresentation()
 return <div className="mt-10 mb-7 flex flex-col gap-6 md:mt-15 md:mb-11 md:flex-row md:items-end md:justify-between"><div><p className="mb-3 text-[10px] font-bold tracking-[.18em] text-orange uppercase">{kicker}</p><h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{title}<span className="text-orange">.</span></h1><p className="mt-4 text-[13px] text-muted">{t(title === t('Trash') ? 'Notes stay here until you restore them.' : 'Keep the good ideas close.')}</p></div>{onAction && <button className="flex items-center gap-2 rounded border border-line bg-surface px-3 py-2.5 text-xs transition hover:border-muted" onClick={onAction}><CirclePlus className="text-orange" size={17} /> {actionLabel}</button>}</div> }
function NoteList({ notes, onSelect, selectedNote }: { notes: Note[]; onSelect: (note: Note) => void; selectedNote: Note | null }): ReactNode {
  const { t } = usePresentation()
 return <div className="border-b border-line py-3 lg:mr-6 lg:border-r lg:border-b-0 lg:pr-6">{notes.map((note) => <button className={`flex w-full gap-3 rounded px-3 py-4 text-left transition ${selectedNote?.id === note.id ? 'bg-surface' : 'hover:bg-surface'}`} onClick={() => onSelect(note)} key={note.id}><span className={`mt-1.25 size-2 shrink-0 rounded-full ${note.accent === 'blue' ? 'bg-sky' : note.accent === 'orange' ? 'bg-orange' : 'bg-note-cream'}`} /><span className="min-w-0"><strong className="mb-1.5 block text-[13px] font-semibold">{note.title}</strong><small className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{note.preview}</small><em className="mt-2 block text-[10px] not-italic text-muted/70">{t(note.updated)}</em></span></button>)}</div> }
function EmptyNotesEditor(): ReactNode {
  const { t } = usePresentation()
 return <div className="m-auto text-center text-muted"><NotebookPen className="mx-auto text-orange" size={28} /><h2 className="mt-4 mb-1 font-display text-2xl text-cream">{t("Pick a note to begin")}</h2><p className="text-xs">{t("Capture the thought before it drifts.")}</p></div> }
