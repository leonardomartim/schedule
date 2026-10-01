import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadNotes, loadScheduleItems, saveNotes, saveScheduleItems } from '../src/schedule-storage'

afterEach(() => vi.unstubAllGlobals())

describe('account-specific local workspace', () => {
  it('keeps notes and agenda entries separate when two accounts use the same browser', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) } })
    const note = { id: 1, title: 'Private note', preview: 'Account one only', accent: 'orange', updated: 'now' } as const
    saveNotes([note], 'account-one')
    saveScheduleItems([], 'account-one')
    expect(loadNotes('account-one')).toEqual([note])
    expect(loadNotes('account-two')).toEqual([])
    expect(loadScheduleItems('account-two')).toEqual([])
    expect(values.has('schedule.items.v1.account-one')).toBe(true)
  })
})
