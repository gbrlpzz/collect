-- Ensure the environment provenance column exists (idempotent; the original
-- migration was applied before this column was added).
alter table public.submissions add column if not exists environment jsonb not null default '{}'::jsonb;
