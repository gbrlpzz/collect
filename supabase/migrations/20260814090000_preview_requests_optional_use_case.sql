-- Research-preview form: the use case is optional on the landing page, but
-- the original table declared it NOT NULL with a 10-4000 length check, which
-- rejected every bare-email submission (constraint 23514). Keep the check for
-- provided values; allow NULL to mean "no use case given".
alter table public.preview_requests
  alter column use_case drop not null;
