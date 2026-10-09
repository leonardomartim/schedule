import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadNotes, loadScheduleItems, saveNotes, saveScheduleItems } from '../src/schedule-storage'

afterEach(() => vi.unstubAllGlobals())

describe('account-specific local workspace', () => {
  it('ignores malformed stored records instead of crashing the workspace', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => '[null, {"id":1}]' } })
    expect(loadNotes('account-one')).toEqual([])
    expect(loadScheduleItems('account-one')).toEqual([])
  })
  it('reports failed writes instead of crashing when browser storage is blocked', () => {
    vi.stubGlobal('window', { localStorage: { setItem: () => { throw new Error('Quota exceeded') } } })
    expect(saveNotes([], 'account-one')).toBe(false)
    expect(saveScheduleItems([], 'account-one')).toBe(false)
  })
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
