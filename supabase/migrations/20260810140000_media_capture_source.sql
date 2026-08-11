-- Media provenance: capture source (camera, library, recorder, picker).
alter table public.submission_media
  add column if not exists capture_source text not null default 'picker';
