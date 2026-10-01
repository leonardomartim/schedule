export const eventInterests = ['music', 'arts', 'food', 'outdoors', 'technology', 'sports'] as const
export type EventInterest = typeof eventInterests[number]
export type EventBudget = 'any' | 'free' | 'paid'

export interface EventPreferences {
  interests: readonly EventInterest[]
  radiusKm: number
  budget: EventBudget
}

export interface RegistrationFields { username: string; email: string; password: string }

export function validateRegistration(fields: RegistrationFields): string | null {
  if (!/^[a-z0-9_]{3,24}$/i.test(fields.username.trim())) return 'Use 3–24 letters, numbers, or underscores for your username.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) return 'Enter a valid email address.'
  if (fields.password.length < 8) return 'Choose a password with at least 8 characters.'
  return null
}

export function parsePreferences(value: unknown): EventPreferences | null {
  if (!value || typeof value !== 'object') return null
  const preferences = value as Record<string, unknown>
  if (!Array.isArray(preferences.interests) || preferences.interests.length === 0 ||
    !preferences.interests.every((interest: unknown) => eventInterests.includes(interest as EventInterest)) ||
    ![5, 10, 25, 50, 100].includes(preferences.radiusKm as number) ||
    !['any', 'free', 'paid'].includes(preferences.budget as string)) return null
  return { interests: [...new Set(preferences.interests)] as EventInterest[], radiusKm: preferences.radiusKm as number, budget: preferences.budget as EventBudget }
}

export function accountErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}
