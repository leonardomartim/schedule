begin;

create function public.valid_event_preferences(preferences jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_typeof(preferences) = 'object'
    and jsonb_typeof(preferences -> 'interests') = 'array'
    and case when jsonb_typeof(preferences -> 'interests') = 'array' then
      jsonb_array_length(preferences -> 'interests') between 1 and 6
      and (preferences -> 'interests') <@ '["music","arts","food","outdoors","technology","sports"]'::jsonb
      else false end
    and preferences -> 'radiusKm' in ('5'::jsonb, '10'::jsonb, '25'::jsonb, '50'::jsonb, '100'::jsonb)
    and preferences ->> 'budget' in ('any', 'free', 'paid'), false);
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text,
  preferences jsonb check (preferences is null or public.valid_event_preferences(preferences)),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (preferences) on public.profiles to authenticated;
grant select on public.profiles to service_role;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Update own preferences" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.create_account_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested_username text;
begin
  if new.raw_app_meta_data ->> 'provider' = 'email' then
    requested_username := lower(trim(new.raw_user_meta_data ->> 'username'));
    if requested_username is null or requested_username !~ '^[a-z0-9_]{3,24}$' then
      raise exception 'A username of 3–24 letters, numbers, or underscores is required.';
    end if;
  end if;
  insert into public.profiles(id, username, display_name)
  values (new.id, requested_username, coalesce(requested_username, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;
revoke execute on function public.create_account_profile() from public, anon, authenticated;
create trigger on_schedule_account_created after insert on auth.users
  for each row execute procedure public.create_account_profile();

-- Existing accounts can complete onboarding without losing their identity.
insert into public.profiles(id, display_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name') from auth.users
on conflict (id) do nothing;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  category text not null check (category in ('music', 'arts', 'food', 'outdoors', 'technology', 'sports')),
  starts_at timestamptz not null check (isfinite(starts_at)),
  venue text not null,
  city text not null check (length(trim(city)) between 2 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  price numeric(12,2) check (price >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  url text check (url ~ '^https?://'),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index events_upcoming_idx on public.events(starts_at) where published;
create index events_city_idx on public.events(lower(city)) where published;
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
grant all on public.events to service_role;
create policy "Read published upcoming events" on public.events for select to authenticated
  using (published and starts_at > now());

create function public.search_upcoming_events(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_city text default null,
  p_radius_km double precision default 25,
  p_query text default '',
  p_interests text[] default '{}',
  p_budget text default 'any'
)
returns table (
  id uuid, title text, description text, category text, starts_at timestamptz,
  venue text, city text, latitude double precision, longitude double precision,
  price numeric, currency text, url text, distance_km double precision
)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_radius_km is null or not (p_radius_km between 1 and 100)
    or (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and not (p_latitude between -90 and 90 and p_longitude between -180 and 180))
    or (p_latitude is null and length(trim(coalesce(p_city, ''))) < 2)
    or length(coalesce(p_query, '')) > 120 or length(coalesce(p_city, '')) > 120
  then raise exception 'Provide a valid location or city and a radius between 1 and 100 km.';
  end if;

  return query
  with nearby as (
    select e.*, case when p_latitude is null then null::double precision else
      6371 * 2 * asin(sqrt(least(1.0, greatest(0.0,
        power(sin(radians(e.latitude - p_latitude) / 2), 2) +
        cos(radians(p_latitude)) * cos(radians(e.latitude)) *
        power(sin(radians(e.longitude - p_longitude) / 2), 2)
      )))) end as calculated_distance
    from public.events e
    where e.published and e.starts_at > now()
      and (p_latitude is not null or lower(e.city) = lower(trim(p_city)))
      and (coalesce(trim(p_query), '') = '' or strpos(lower(e.title || ' ' || e.description || ' ' || e.venue || ' ' || e.category), lower(trim(p_query))) > 0)
  )
  select n.id, n.title, n.description, n.category, n.starts_at, n.venue, n.city,
    n.latitude, n.longitude, n.price, n.currency, n.url, n.calculated_distance
  from nearby n
  where p_latitude is null or n.calculated_distance <= p_radius_km
  order by (
    case when n.category = any(p_interests) then 2 else 0 end +
    case when (p_budget = 'free' and n.price = 0) or (p_budget = 'paid' and n.price > 0) then 1 else 0 end
  ) desc, n.starts_at, n.id
  limit 100;
end;
$$;
revoke execute on function public.search_upcoming_events(double precision, double precision, text, double precision, text, text[], text) from public, anon;
grant execute on function public.search_upcoming_events(double precision, double precision, text, double precision, text, text[], text) to authenticated;

commit;
