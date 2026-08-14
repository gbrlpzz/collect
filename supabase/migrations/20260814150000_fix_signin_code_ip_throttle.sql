-- Fix the anonymous self-service sign-in-code per-IP throttle.
--
-- The original bump_signin_code_request stored the RETURNING request_count
-- into a boolean variable and returned NULL whenever the ON CONFLICT update's
-- WHERE clause skipped the row (i.e. exactly when the limit was reached).
-- The Edge Function only short-circuits on an explicit `false`, so the
-- throttle failed open: requests beyond the cap still minted codes.
--
-- The function now returns a real boolean: true while a request is within the
-- window cap, false once the cap is reached (or for malformed input).

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
  recorded integer;
begin
  if length(p_ip_hash) <> 64 or p_max_requests < 1 or p_window_minutes < 1 then
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
  into recorded;

  return coalesce(recorded, 0) > 0;
end;
$$;

revoke all on function public.bump_signin_code_request(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.bump_signin_code_request(text, integer, integer)
  to service_role;
