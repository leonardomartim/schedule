import type { ReactNode } from "react"
import type { Note } from "../types"

export const inputClassName = 'w-full rounded border border-line bg-ink px-3 py-2.5 text-[13px] text-cream outline-none transition focus:border-orange'
export const iconButtonClassName = 'grid size-8 place-items-center rounded text-muted transition hover:bg-surface-raised hover:text-cream'
const noteSurfaceClassNames: Record<Note['accent'], string> = {
  orange: 'bg-note-cream text-note-ink',
  blue: 'bg-note-blue text-note-blue-ink',
  cream: 'bg-note-cream text-note-ink',
}

export function NoteCard({ note }: { note: Note }): ReactNode { return <div className={`relative min-h-31.5 overflow-hidden rounded-lg p-5 ${noteSurfaceClassNames[note.accent]}`}><span className="mb-5 block size-2 rounded-full bg-current opacity-60" /><h3 className="mb-2 font-display text-lg">{note.title}</h3><p className="max-w-55 text-[11px] leading-relaxed opacity-75">{note.preview}</p><span className="absolute top-4 right-4 text-lg">↗</span><span className="absolute -right-8 -bottom-11 size-32 rounded-full border border-current opacity-20" /></div> }
export function Field({ label, children }: { label: string; children: ReactNode }): ReactNode { return <label className="grid gap-1.5 text-[11px] text-muted"><span>{label}</span>{children}</label> }
export function Avatar({ displayName, small = false }: { displayName: string; small?: boolean }): ReactNode { return <div className={`grid place-items-center rounded-full bg-sky text-[10px] font-bold text-ink ${small ? 'size-7.5' : 'size-8'}`}>{displayName.slice(0, 2).toUpperCase()}</div> }
