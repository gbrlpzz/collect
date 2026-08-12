-- Per-submission attention flag: easy binary filter for failed checks.
-- The question text is never stored (only a stable check key); this column
-- is the filterable signal: true = the injected check was answered wrong.
alter table public.submissions
  add column if not exists attention_failed boolean not null default false;
