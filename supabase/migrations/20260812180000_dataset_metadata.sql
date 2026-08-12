-- Dataset metadata for FAIR-compliant exports (2026-08-12)
-- Optional fields admins set at project creation; they are carried into the
-- checkpoint manifest, DataCite metadata, and the dataset README.
alter table public.projects
  add column if not exists license text,
  add column if not exists contact_email text,
  add column if not exists dataset_identifier text;

comment on column public.projects.license is
  'SPDX license identifier for the collected dataset (e.g. CC-BY-4.0, CC0-1.0).';
comment on column public.projects.contact_email is
  'Dataset contact for reuse questions; carried into DataCite metadata.';
comment on column public.projects.dataset_identifier is
  'Optional persistent identifier (DOI or landing-page URL) for the dataset.';
