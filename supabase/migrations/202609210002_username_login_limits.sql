begin;

create schema schedule_private;
revoke all on schema schedule_private from public, anon, authenticated;
create table schedule_private.username_login_buckets (
  bucket_key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
alter table schedule_private.username_login_buckets enable row level security;
revoke all on schedule_private.username_login_buckets from public, anon, authenticated;

create function public.consume_username_login_attempt(p_username_hash text, p_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  username_attempts integer;
  ip_attempts integer;
begin
  if p_username_hash is null or p_ip_hash is null or
    p_username_hash !~ '^[a-f0-9]{64}$' or p_ip_hash !~ '^[a-f0-9]{64}$'
  then return false; end if;

  delete from schedule_private.username_login_buckets where expires_at < now() - interval '1 day';
  insert into schedule_private.username_login_buckets as bucket (bucket_key, attempts, expires_at)
  values ('user:' || p_username_hash, 1, now() + interval '10 minutes')
  on conflict (bucket_key) do update set
    attempts = case when bucket.expires_at <= now() then 1 else bucket.attempts + 1 end,
    expires_at = case when bucket.expires_at <= now() then now() + interval '10 minutes' else bucket.expires_at end
  returning attempts into username_attempts;

  insert into schedule_private.username_login_buckets as bucket (bucket_key, attempts, expires_at)
  values ('ip:' || p_ip_hash, 1, now() + interval '10 minutes')
  on conflict (bucket_key) do update set
    attempts = case when bucket.expires_at <= now() then 1 else bucket.attempts + 1 end,
    expires_at = case when bucket.expires_at <= now() then now() + interval '10 minutes' else bucket.expires_at end
  returning attempts into ip_attempts;

  return username_attempts <= 10 and ip_attempts <= 60;
end;
$$;
revoke execute on function public.consume_username_login_attempt(text, text) from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text, text) to service_role;

commit;
