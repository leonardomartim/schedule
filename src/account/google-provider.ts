const unavailableMessage = 'Could not check Google sign-in right now. Please try again or use your username or email and password.'

function readGoogleProviderStatus(settings: unknown): boolean | null {
  if (!settings || typeof settings !== 'object' || !('external' in settings)) return null
  const external = settings.external
  if (!external || typeof external !== 'object' || !('google' in external)) return null
  return typeof external.google === 'boolean' ? external.google : null
}

export async function verifyGoogleProviderEnabled(
  projectUrl = import.meta.env.VITE_SUPABASE_URL,
  publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
): Promise<void> {
  if (!projectUrl || !publicKey) throw new Error('Sign-in is not configured yet. Please contact the site owner.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let enabled: boolean | null
  try {
    const response = await fetch(`${projectUrl.replace(/\/+$/, '')}/auth/v1/settings`, {
      headers: { apikey: publicKey }, cache: 'no-store', credentials: 'omit', signal: controller.signal,
    })
    if (!response.ok) throw new Error(unavailableMessage)
    const settings: unknown = await response.json()
    enabled = readGoogleProviderStatus(settings)
  } catch {
    throw new Error(unavailableMessage)
  } finally { clearTimeout(timeout) }

  if (enabled === null) throw new Error(unavailableMessage)
  if (!enabled) throw new Error('Google sign-in is not enabled for this site yet. Please use your username or email and password, or contact the site owner.')
}
