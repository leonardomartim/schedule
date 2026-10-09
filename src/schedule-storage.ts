import type { Note, ScheduleItem } from './types'
import { isStoredNote, isStoredScheduleItem } from './workspace-record-validation'

const notesStorageKey = 'schedule.notes.v1'
const scheduleStorageKey = 'schedule.items.v1'

function loadStoredArray<T>(key: string, isRecord: (value: unknown) => value is T): T[] {
  if (typeof window === 'undefined') return []

  try {
    const savedValue: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    return Array.isArray(savedValue) ? savedValue.filter(isRecord) : []
  } catch {
    return []
  }
}

function saveStoredArray<T>(key: string, values: T[]): boolean {
  try {
    if (typeof window === 'undefined') return false
    window.localStorage.setItem(key, JSON.stringify(values))
    return true
  } catch { return false }
}

export function loadScheduleItems(userId: string): ScheduleItem[] {
  return loadStoredArray(`${scheduleStorageKey}.${userId}`, isStoredScheduleItem)
}

export function saveScheduleItems(items: ScheduleItem[], userId: string): boolean {
  return saveStoredArray(`${scheduleStorageKey}.${userId}`, items)
}

export function loadNotes(userId: string): Note[] {
  return loadStoredArray(`${notesStorageKey}.${userId}`, isStoredNote)
}

export function saveNotes(notes: Note[], userId: string): boolean {
  return saveStoredArray(`${notesStorageKey}.${userId}`, notes)
}
