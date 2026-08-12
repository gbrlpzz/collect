-- Supabase grants new public-schema functions to API roles automatically.
-- These three security-definer bridges are Edge-service internals only.
revoke all on function public.list_allowed_admin_patterns()
  from public, anon, authenticated;
revoke all on function public.store_session_link_code(text, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.consume_session_link_code(text)
  from public, anon, authenticated;

grant execute on function public.list_allowed_admin_patterns()
  to service_role;
grant execute on function public.store_session_link_code(text, uuid, timestamptz)
  to service_role;
grant execute on function public.consume_session_link_code(text)
  to service_role;
