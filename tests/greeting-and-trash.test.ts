import { describe, expect, it } from 'vitest'
import { getGreetingForHour } from '../src/greeting'
import { moveNoteToTrash, permanentlyDeleteNote, restoreNoteFromTrash } from '../src/note-lifecycle'
import type { Note } from '../src/types'

const activeNote: Note = { id: 7, title: 'A note', preview: 'A thought', updated: 'Just now', accent: 'orange' }

describe('location-aware day greeting', () => {
  it('uses the requested boundaries for morning, afternoon, and evening', () => {
    expect(getGreetingForHour(4)).toBe('Good evening')
    expect(getGreetingForHour(5)).toBe('Good morning')
    expect(getGreetingForHour(11)).toBe('Good morning')
    expect(getGreetingForHour(12)).toBe('Good afternoon')
    expect(getGreetingForHour(17)).toBe('Good afternoon')
    expect(getGreetingForHour(18)).toBe('Good evening')
  })
})

describe('note trash lifecycle', () => {
  it('moves a note to trash and lets the same note be restored', () => {
    const trashedNotes = moveNoteToTrash([activeNote], activeNote.id, '2026-09-12T12:00:00.000Z')
    expect(trashedNotes[0]?.deletedAt).toBe('2026-09-12T12:00:00.000Z')
    expect(restoreNoteFromTrash(trashedNotes, activeNote.id)[0]).toEqual(activeNote)
  })

  it('removes a trashed note permanently only when requested', () => {
    const trashedNotes = moveNoteToTrash([activeNote], activeNote.id, '2026-09-12T12:00:00.000Z')
    expect(permanentlyDeleteNote(trashedNotes, activeNote.id)).toEqual([])
  })
})
