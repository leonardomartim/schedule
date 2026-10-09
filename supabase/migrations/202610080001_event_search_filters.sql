begin;

-- Keep the original positional arguments compatible; optional filters run before LIMIT.
drop function public.search_upcoming_events(double precision, double precision, text, double precision, text, text[], text);

create function public.search_upcoming_events(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_city text default null,
  p_radius_km double precision default 25,
  p_query text default '',
  p_interests text[] default '{}',
  p_budget text default 'any',
  p_category text default null,
  p_price text default 'any',
  p_starts_after timestamptz default null,
  p_starts_before timestamptz default null,
  p_sort text default 'recommended'
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
  if (p_category is not null and p_category not in ('music', 'arts', 'food', 'outdoors', 'technology', 'sports'))
    or p_price is null or p_price not in ('any', 'free', 'paid')
    or p_sort is null or p_sort not in ('recommended', 'soonest', 'nearest', 'price')
    or (p_starts_after is not null and not isfinite(p_starts_after))
    or (p_starts_before is not null and not isfinite(p_starts_before))
    or p_starts_after >= p_starts_before
    or (p_sort = 'nearest' and p_latitude is null)
  then raise exception 'Provide valid category, price, dates and sort filters.';
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
      and (p_category is null or e.category = p_category)
      and (p_price = 'any' or (p_price = 'free' and e.price = 0) or (p_price = 'paid' and e.price > 0))
      and (p_starts_after is null or e.starts_at >= p_starts_after)
      and (p_starts_before is null or e.starts_at < p_starts_before)
      and (coalesce(trim(p_query), '') = '' or strpos(lower(e.title || ' ' || e.description || ' ' || e.venue || ' ' || e.category), lower(trim(p_query))) > 0)
  )
  select n.id, n.title, n.description, n.category, n.starts_at, n.venue, n.city,
    n.latitude, n.longitude, n.price, n.currency, n.url, n.calculated_distance
  from nearby n
  where p_latitude is null or n.calculated_distance <= p_radius_km
  order by
    case when p_sort = 'recommended' then (
      case when n.category = any(p_interests) then 2 else 0 end +
      case when (p_budget = 'free' and n.price = 0) or (p_budget = 'paid' and n.price > 0) then 1 else 0 end
    ) else 0 end desc,
    case when p_sort = 'nearest' then n.calculated_distance end asc nulls last,
    case when p_sort = 'price' then n.price end asc nulls last,
    n.starts_at, n.id
  limit 100;
end;
$$;

revoke execute on function public.search_upcoming_events(double precision, double precision, text, double precision, text, text[], text, text, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.search_upcoming_events(double precision, double precision, text, double precision, text, text[], text, text, text, timestamptz, timestamptz, text) to authenticated;

create index if not exists events_published_city_date on public.events(lower(city), starts_at) where published;
create index if not exists events_published_category_date on public.events(category, starts_at) where published;

notify pgrst, 'reload schema';
commit;
