-- Automatic attention verification for every survey.
create table if not exists public.attention_checks (
  key text primary key,
  prompt text not null,
  options jsonb not null,
  correct_value text not null,
  guess_probability numeric(4,3) not null check (guess_probability > 0 and guess_probability <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.attention_checks (key, prompt, options, correct_value, guess_probability, active)
values
('sky_color', 'On a clear day, what color is the sky?', '[{"value":"blue","label":"Blue"},{"value":"green","label":"Green"},{"value":"red","label":"Red"},{"value":"yellow","label":"Yellow"}]', 'blue', 0.25, true),
('triangle_sides', 'How many sides does a triangle have?', '[{"value":"two","label":"2"},{"value":"three","label":"3"},{"value":"four","label":"4"},{"value":"five","label":"5"}]', 'three', 0.25, true),
('add_two_two', 'What is 2 + 2?', '[{"value":"three","label":"3"},{"value":"four","label":"4"},{"value":"five","label":"5"},{"value":"six","label":"6"}]', 'four', 0.25, true),
('sun_rise', 'In which direction does the sun rise?', '[{"value":"west","label":"West"},{"value":"north","label":"North"},{"value":"east","label":"East"},{"value":"south","label":"South"}]', 'east', 0.25, true),
('which_fruit', 'Which of these is a fruit?', '[{"value":"carrot","label":"Carrot"},{"value":"apple","label":"Apple"},{"value":"potato","label":"Potato"},{"value":"onion","label":"Onion"}]', 'apple', 0.25, true),
('winter_month', 'Which month falls in winter in the northern hemisphere?', '[{"value":"july","label":"July"},{"value":"december","label":"December"},{"value":"may","label":"May"},{"value":"september","label":"September"}]', 'december', 0.25, true),
('water_boils', 'At sea level, what is the boiling point of water in degrees Celsius?', '[{"value":"50","label":"50C"},{"value":"100","label":"100C"},{"value":"150","label":"150C"},{"value":"200","label":"200C"}]', '100', 0.25, true),
('week_days', 'How many days are in a week?', '[{"value":"five","label":"5"},{"value":"six","label":"6"},{"value":"seven","label":"7"},{"value":"eight","label":"8"}]', 'seven', 0.25, true),
('multiply_three_three', 'What is 3 x 3?', '[{"value":"six","label":"6"},{"value":"nine","label":"9"},{"value":"twelve","label":"12"},{"value":"fifteen","label":"15"}]', 'nine', 0.25, true),
('which_planet', 'Which of these is a planet?', '[{"value":"moon","label":"The Moon"},{"value":"sun","label":"The Sun"},{"value":"mars","label":"Mars"},{"value":"star","label":"A star"}]', 'mars', 0.25, true)
on conflict (key) do nothing;

create table if not exists public.attention_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  contributor_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  check_key text not null references public.attention_checks(key),
  selected_value text not null,
  correct boolean not null,
  guess_probability numeric(4,3) not null,
  created_at timestamptz not null default now()
);
create index if not exists attention_responses_contributor_idx on public.attention_responses (contributor_id, created_at desc);

alter table public.contributor_profiles
  add column if not exists attention_score numeric(5,2) check (attention_score >= 0 and attention_score <= 100),
  add column if not exists attention_checks_total integer not null default 0,
  add column if not exists attention_correct_total integer not null default 0,
  add column if not exists attention_last_at timestamptz;

alter table public.attention_responses enable row level security;

drop policy if exists attention_responses_select on public.attention_responses;
create policy attention_responses_select on public.attention_responses for select to authenticated
using (
  contributor_id = (select auth.uid())
  or exists (
    select 1 from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = project_id and om.user_id = (select auth.uid()) and om.role = 'admin'
  )
);
grant select on public.attention_responses to authenticated;

create or replace function private.recompute_attention_score(target_user uuid)
returns void
language plpgsql security definer set search_path = public, private, pg_catalog
as $$
declare
  observed int;
  expected numeric;
  total int;
  score numeric;
begin
  select count(*), coalesce(sum(correct::int), 0), coalesce(sum(guess_probability), 0)
    into total, observed, expected
  from public.attention_responses
  where contributor_id = target_user;

  if total = 0 then
    update public.contributor_profiles
    set attention_score = null, attention_checks_total = 0, attention_correct_total = 0, attention_last_at = null
    where user_id = target_user;
    return;
  end if;

  score := case when total - expected <= 0 then 1
                else greatest(0, least(1, (observed - expected) / (total - expected)))
           end;
  update public.contributor_profiles
  set attention_score = round(score * 100, 2),
      attention_checks_total = total,
      attention_correct_total = observed,
      attention_last_at = now()
  where user_id = target_user;
end;
$$;
