-- Self-service sign-in-code requests are legitimately project- and
-- organization-less, but audit_events.organization_id was NOT NULL. Their
-- audit row was rejected by the constraint and silently dropped. Allow the
-- row so every code issuance/request is recorded; the audit RLS policy still
-- keeps org-less rows invisible to authenticated users (service role only).
alter table public.audit_events
  alter column organization_id drop not null;
