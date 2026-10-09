import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const database = new PGlite()
const firstUser = '00000000-0000-4000-8000-000000000001'
const secondUser = '00000000-0000-4000-8000-000000000002'

beforeAll(async () => {
  await database.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb, raw_app_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `)
  await database.exec(readFileSync('supabase/migrations/202609210001_accounts_and_events.sql', 'utf8'))
  await database.exec(readFileSync('supabase/migrations/202609210002_username_login_limits.sql', 'utf8'))
  await database.exec(readFileSync('supabase/migrations/202610080001_event_search_filters.sql', 'utf8'))
  await database.exec(`
    insert into auth.users values
      ('${firstUser}', '{"username":"leonardo"}', '{"provider":"email"}'),
      ('${secondUser}', '{"full_name":"Google User"}', '{"provider":"google"}');
    insert into public.events(title, category, starts_at, venue, city, latitude, longitude, price, published) values
      ('Free music', 'music', now() + interval '2 days', 'Hall', 'São Paulo', -23.55, -46.63, 0, true),
      ('Paid music', 'music', now() + interval '1 day', 'Hall', 'São Paulo', -23.55, -46.63, 50, true),
      ('Sport', 'sports', now() + interval '1 day', 'Park', 'São Paulo', -23.55, -46.63, 0, true),
      ('Distant music', 'music', now() + interval '1 day', 'Hall', 'Rio', -22.9, -43.2, 0, true),
      ('Expired', 'music', now() - interval '1 day', 'Hall', 'São Paulo', -23.55, -46.63, 0, true),
      ('Draft', 'music', now() + interval '1 day', 'Hall', 'São Paulo', -23.55, -46.63, 0, false);
  `)
}, 20_000)

afterAll(async () => { await database.close() })

async function asUser<T>(action: () => Promise<T>): Promise<T> {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${firstUser}', false);`)
  try { return await action() } finally { await database.exec('reset role') }
}

describe('database authentication and event policies', () => {
  it('creates profiles for password and Google users', async () => {
    const { rows } = await database.query<{ username: string | null; display_name: string | null }>('select username, display_name from public.profiles order by id')
    expect(rows).toEqual([{ username: 'leonardo', display_name: 'leonardo' }, { username: null, display_name: 'Google User' }])
  })
  it('restricts profile reads and preference writes to the current user', async () => {
    await asUser(async () => {
      const { rows } = await database.query<{ id: string }>('select id from public.profiles')
      expect(rows).toEqual([{ id: firstUser }])
      const changed = await database.query(`update public.profiles set preferences = '{"interests":["music"],"radiusKm":25,"budget":"free"}' where id = '${secondUser}' returning id`)
      expect(changed.rows).toHaveLength(0)
      await expect(database.exec(`update public.profiles set username = 'changed'`)).rejects.toThrow(/permission denied/)
      await expect(database.exec(`update public.profiles set preferences = '{}'`)).rejects.toThrow(/check constraint/)
      await database.exec(`update public.profiles set preferences = '{"interests":["music"],"radiusKm":25,"budget":"free"}'`)
    })
  })
  it('returns only future, published events within the radius in preference order', async () => {
    await asUser(async () => {
      const { rows } = await database.query<{ title: string }>(`select title from public.search_upcoming_events(-23.55, -46.63, null, 25, '', array['music'], 'free')`)
      expect(rows.map((row) => row.title)).toEqual(['Free music', 'Paid music', 'Sport'])
    })
  })
  it('supports case-insensitive city searches, literal keywords, and rejects unbounded searches', async () => {
    await asUser(async () => {
      const { rows } = await database.query<{ title: string }>(`select title from public.search_upcoming_events(null, null, 'são paulo', 25, 'Free', array['music'], 'free')`)
      expect(rows.map((row) => row.title)).toEqual(['Free music'])
      const wildcard = await database.query(`select title from public.search_upcoming_events(null, null, 'São Paulo', 25, '%', array['music'], 'any')`)
      expect(wildcard.rows).toHaveLength(0)
      await expect(database.query(`select * from public.search_upcoming_events(null, null, null, 25, '', '{}', 'any')`)).rejects.toThrow()
      await expect(database.query(`select * from public.search_upcoming_events(91, 0, null, 25, '', '{}', 'any')`)).rejects.toThrow()
    })
  })
  it('prevents ordinary users from publishing catalog events and anonymous users from reading profiles', async () => {
    await asUser(async () => {
      await expect(database.exec("update public.events set published = true")).rejects.toThrow(/permission denied/)
      const { rows } = await database.query<{ title: string }>("select title from public.events where title = 'Draft'")
      expect(rows).toHaveLength(0)
    })
    await database.exec('set role anon')
    try {
      await expect(database.query('select * from public.profiles')).rejects.toThrow(/permission denied/)
      await expect(database.query("select * from public.search_upcoming_events(0, 0, null, 25, '', '{}', 'any')")).rejects.toThrow(/permission denied/)
    } finally { await database.exec('reset role') }
  })
  it('applies strict category, price and date filters before limiting and supports nearest ordering', async () => {
    await asUser(async () => {
      const free = await database.query<{ title: string }>(`select title from public.search_upcoming_events(p_city => 'São Paulo', p_category => 'music', p_price => 'free', p_sort => 'soonest')`)
      expect(free.rows.map((row) => row.title)).toEqual(['Free music'])
      const dates = await database.query<{ title: string }>(`select title from public.search_upcoming_events(p_city => 'São Paulo', p_starts_after => now() + interval '36 hours', p_starts_before => now() + interval '3 days')`)
      expect(dates.rows.map((row) => row.title)).toEqual(['Free music'])
      const nearest = await database.query<{ title: string }>(`select title from public.search_upcoming_events(p_latitude => -23.55, p_longitude => -46.63, p_radius_km => 100, p_sort => 'nearest')`)
      expect(nearest.rows).toHaveLength(3)
      await expect(database.query(`select * from public.search_upcoming_events(p_city => 'São Paulo', p_price => 'invalid')`)).rejects.toThrow()
    })
  })
  it('does not discard filtered matches behind the first hundred recommendations', async () => {
    await database.exec(`insert into public.events(title, category, starts_at, venue, city, latitude, longitude, price, published)
      select 'Bulk ' || i, 'music', now() + interval '5 days', 'Hall', 'Filter City', 0, 0, 0, true from generate_series(1, 101) i;
      insert into public.events(title, category, starts_at, venue, city, latitude, longitude, price, published)
      values ('Filtered sport', 'sports', now() + interval '6 days', 'Hall', 'Filter City', 0, 0, 50, true);`)
    await asUser(async () => {
      const result = await database.query<{ title: string }>(`select title from public.search_upcoming_events(p_city => 'Filter City', p_category => 'sports', p_price => 'paid')`)
      expect(result.rows).toEqual([{ title: 'Filtered sport' }])
    })
  })
  it('limits repeated username attempts and resets expired buckets', async () => {
    const usernameHash = 'a'.repeat(64)
    const ipHash = 'b'.repeat(64)
    await database.exec('set role service_role')
    try {
      for (let attempt = 1; attempt <= 11; attempt += 1) {
        const { rows } = await database.query<{ allowed: boolean }>('select public.consume_username_login_attempt($1, $2) as allowed', [usernameHash, ipHash])
        expect(rows[0].allowed).toBe(attempt <= 10)
      }
    } finally { await database.exec('reset role') }
    await database.exec("update schedule_private.username_login_buckets set expires_at = now() - interval '1 minute'")
    const { rows } = await database.query<{ allowed: boolean }>('select public.consume_username_login_attempt($1, $2) as allowed', [usernameHash, ipHash])
    expect(rows[0].allowed).toBe(true)
    await asUser(async () => {
      await expect(database.query('select public.consume_username_login_attempt($1, $2)', [usernameHash, ipHash])).rejects.toThrow(/permission denied/)
    })
  })
})
