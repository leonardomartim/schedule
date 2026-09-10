import { describe, expect, it } from 'vitest'
import { scheduleItems } from '../src/data'

describe('schedule seed data', () => {
  it('starts with a focused daily agenda', () => {
    expect(scheduleItems).toHaveLength(6)
    expect(scheduleItems.filter((item) => item.completed)).toHaveLength(1)
  })

  it('uses a meaningful category for every agenda item', () => {
    expect(scheduleItems.every((item) => ['work', 'personal', 'focus', 'health'].includes(item.category))).toBe(true)
  })
})
