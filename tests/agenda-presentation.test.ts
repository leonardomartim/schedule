import { describe, expect, it } from 'vitest'
import { getScheduleCategoryPresentation } from '../src/agenda-presentation'

describe('agenda category presentation', () => {
  it('provides a stable Tailwind presentation for every schedule category', () => {
    expect(getScheduleCategoryPresentation('work')).toEqual({ label: 'Work', badgeClassName: 'bg-sky/12 text-sky', dotClassName: 'bg-sky ring-sky' })
    expect(getScheduleCategoryPresentation('personal')).toEqual({ label: 'Personal', badgeClassName: 'bg-peach/12 text-peach', dotClassName: 'bg-peach ring-peach' })
    expect(getScheduleCategoryPresentation('focus')).toEqual({ label: 'Focus', badgeClassName: 'bg-orange/12 text-orange', dotClassName: 'bg-orange ring-orange' })
    expect(getScheduleCategoryPresentation('health')).toEqual({ label: 'Health', badgeClassName: 'bg-lilac/12 text-lilac', dotClassName: 'bg-lilac ring-lilac' })
  })
})
