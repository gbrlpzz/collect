-- Add internally consistent instruction checks. Keep historical checks active
-- so observations created by older installed clients can still be interpreted
-- when they eventually sync. Current clients select only from the keys below.

insert into public.attention_checks (
  key, prompt, options, correct_value, guess_probability, active
)
values
  ('select_blue', 'For this attention check, select “Blue”.', '[{"value":"blue","label":"Blue"},{"value":"green","label":"Green"},{"value":"red","label":"Red"},{"value":"yellow","label":"Yellow"}]', 'blue', 0.25, true),
  ('select_three', 'For this attention check, select “3”.', '[{"value":"three","label":"3"},{"value":"two","label":"2"},{"value":"four","label":"4"},{"value":"five","label":"5"}]', 'three', 0.25, true),
  ('select_circle', 'For this attention check, select “Circle”.', '[{"value":"circle","label":"Circle"},{"value":"square","label":"Square"},{"value":"triangle","label":"Triangle"},{"value":"rectangle","label":"Rectangle"}]', 'circle', 0.25, true),
  ('select_field', 'For this attention check, select “Field”.', '[{"value":"field","label":"Field"},{"value":"file","label":"File"},{"value":"filled","label":"Filled"},{"value":"find","label":"Find"}]', 'field', 0.25, true),
  ('select_north', 'For this attention check, select “North”.', '[{"value":"north","label":"North"},{"value":"east","label":"East"},{"value":"south","label":"South"},{"value":"west","label":"West"}]', 'north', 0.25, true),
  ('select_yes', 'For this attention check, select “Yes”.', '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"maybe","label":"Maybe"},{"value":"unknown","label":"Unknown"}]', 'yes', 0.25, true),
  ('select_tuesday', 'For this attention check, select “Tuesday”.', '[{"value":"tuesday","label":"Tuesday"},{"value":"monday","label":"Monday"},{"value":"thursday","label":"Thursday"},{"value":"saturday","label":"Saturday"}]', 'tuesday', 0.25, true),
  ('select_small', 'For this attention check, select “Small”.', '[{"value":"small","label":"Small"},{"value":"large","label":"Large"},{"value":"wide","label":"Wide"},{"value":"tall","label":"Tall"}]', 'small', 0.25, true),
  ('select_b', 'For this attention check, select “B”.', '[{"value":"b","label":"B"},{"value":"a","label":"A"},{"value":"c","label":"C"},{"value":"d","label":"D"}]', 'b', 0.25, true),
  ('select_second', 'For this attention check, select “Second”.', '[{"value":"second","label":"Second"},{"value":"first","label":"First"},{"value":"third","label":"Third"},{"value":"fourth","label":"Fourth"}]', 'second', 0.25, true)
on conflict (key) do update
set prompt = excluded.prompt,
    options = excluded.options,
    correct_value = excluded.correct_value,
    guess_probability = excluded.guess_probability,
    active = true;

do $$
begin
  if exists (
    select 1
    from public.attention_checks
    where active
      and not options @> jsonb_build_array(
        jsonb_build_object('value', correct_value)
      )
  ) then
    raise exception 'Every active attention check must contain its correct value';
  end if;
end;
$$;

-- A generated alias gives downstream users an explicit pass/fail field without
-- allowing it to drift from the server-derived result.
alter table public.attention_responses
  add column if not exists passed boolean generated always as (correct) stored;

comment on column public.attention_responses.passed is
  'Server-derived attention-test result. True when selected_value equals the active check correct_value.';
