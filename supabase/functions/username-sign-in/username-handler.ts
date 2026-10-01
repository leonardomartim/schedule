export interface UsernameSession { access_token: string; refresh_token: string }
export interface UsernameSignInDependencies {
  allowedOrigins: string[]
  consumeAttempt: (username: string, ipAddress: string) => Promise<boolean>
  findEmail: (username: string) => Promise<string | null>
  authenticate: (email: string, password: string) => Promise<UsernameSession | null>
}

export async function handleUsernameSignIn(request: Request, dependencies: UsernameSignInDependencies): Promise<Response> {
  const origin = request.headers.get('origin')
  const originAllowed = origin !== null && dependencies.allowedOrigins.includes(origin)
  const headers = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
    'Access-Control-Allow-Origin': originAllowed ? origin : dependencies.allowedOrigins[0] ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  const reply = (status: number, body: object): Response => new Response(JSON.stringify(body), { status, headers })
  if (origin && !originAllowed) return reply(403, { error: 'Origin not allowed.' })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' })

  let fields: unknown
  try {
    const body = await request.text()
    if (body.length > 4096) return reply(413, { error: 'Request too large.' })
    fields = JSON.parse(body)
  } catch { return reply(400, { error: 'Invalid request.' }) }
  if (!fields || typeof fields !== 'object' || !('username' in fields) || !('password' in fields) ||
    typeof fields.username !== 'string' || typeof fields.password !== 'string') return reply(400, { error: 'Enter your username and password.' })
  const username = fields.username.trim().toLowerCase()
  const password = fields.password
  if (!/^[a-z0-9_]{3,24}$/.test(username) || !password || password.length > 1024) return reply(400, { error: 'Enter your username and password.' })

  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!await dependencies.consumeAttempt(username, ipAddress)) return reply(429, { error: 'Too many attempts. Please try again in 10 minutes.' })
    const email = await dependencies.findEmail(username)
    // Unknown usernames also pass through Auth; never expose account email addresses.
    const session = await dependencies.authenticate(email ?? `${crypto.randomUUID()}@invalid.example`, password)
    if (!email || !session) return reply(401, { error: 'Invalid login credentials.' })
    return reply(200, { access_token: session.access_token, refresh_token: session.refresh_token })
  } catch { return reply(503, { error: 'Sign-in is unavailable. Please try again shortly.' }) }
}
