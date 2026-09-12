import type { Note } from './types'

export function moveNoteToTrash(notes: Note[], noteId: number, deletedAt: string): Note[] {
  return notes.map((note) => note.id === noteId ? { ...note, deletedAt } : note)
}

export function restoreNoteFromTrash(notes: Note[], noteId: number): Note[] {
  return notes.map((note) => {
    if (note.id !== noteId) return note
    const { deletedAt: _deletedAt, ...activeNote } = note
    return activeNote
  })
}

export function permanentlyDeleteNote(notes: Note[], noteId: number): Note[] {
  return notes.filter((note) => note.id !== noteId)
}
