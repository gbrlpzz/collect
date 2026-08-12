-- Device provenance: model/OS/browser recorded with submissions and devices.
alter table public.submissions
  add column if not exists device_model text not null default '',
  add column if not exists device_os text not null default '',
  add column if not exists browser text not null default '';

alter table public.devices
  add column if not exists device_model text not null default '',
  add column if not exists device_os text not null default '',
  add column if not exists browser text not null default '';

-- Automatic environment provenance (device, screen, connection, battery, timezone).
alter table public.submissions
  add column if not exists environment jsonb not null default '{}'::jsonb;
