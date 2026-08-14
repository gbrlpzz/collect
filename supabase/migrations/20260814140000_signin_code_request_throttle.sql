-- Per-IP throttle for the anonymous self-service sign-in-code request. The
-- endpoint already limits minting per user (3 per 20 minutes); this stops a
-- single source from hammering many addresses at once.
create table if not exists private.signin_code_requests (
  ip_hash text primary key,
  request_count integer not null default 1,
  window_started_at timestamptz not null default now()
);

create or replace function public.bump_signin_code_request(
  p_ip_hash text,
  p_window_minutes integer default 60,
  p_max_requests integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if length(p_ip_hash) <> 64 then
    return false;
  end if;
  delete from private.signin_code_requests
    where window_started_at <= now() - make_interval(mins => p_window_minutes);
  insert into private.signin_code_requests (ip_hash, request_count, window_started_at)
  values (p_ip_hash, 1, now())
  on conflict (ip_hash) do update
    set request_count = private.signin_code_requests.request_count + 1,
        window_started_at = now()
    where private.signin_code_requests.request_count < p_max_requests
    returning request_count
    into allowed;
  return allowed;
end;
$$;

revoke all on function public.bump_signin_code_request(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.bump_signin_code_request(text, integer, integer)
  to service_role;
