-- Expand the literal instruction-check bank so repeated fieldwork does not
-- become predictable. Historical keys remain active for offline clients.

insert into public.attention_checks (
  key, prompt, options, correct_value, guess_probability, active
)
values
  ('select_orange', 'For this attention check, select “Orange”.', '[{"value":"orange","label":"Orange"},{"value":"purple","label":"Purple"},{"value":"brown","label":"Brown"},{"value":"gray","label":"Gray"}]', 'orange', 0.25, true),
  ('select_seven', 'For this attention check, select “7”.', '[{"value":"seven","label":"7"},{"value":"six","label":"6"},{"value":"eight","label":"8"},{"value":"nine","label":"9"}]', 'seven', 0.25, true),
  ('select_triangle', 'For this attention check, select “Triangle”.', '[{"value":"triangle","label":"Triangle"},{"value":"oval","label":"Oval"},{"value":"diamond","label":"Diamond"},{"value":"star","label":"Star"}]', 'triangle', 0.25, true),
  ('select_river', 'For this attention check, select “River”.', '[{"value":"river","label":"River"},{"value":"road","label":"Road"},{"value":"roof","label":"Roof"},{"value":"room","label":"Room"}]', 'river', 0.25, true),
  ('select_olive', 'For this attention check, select “Olive”.', '[{"value":"olive","label":"Olive"},{"value":"oak","label":"Oak"},{"value":"pine","label":"Pine"},{"value":"willow","label":"Willow"}]', 'olive', 0.25, true),
  ('select_friday', 'For this attention check, select “Friday”.', '[{"value":"friday","label":"Friday"},{"value":"wednesday","label":"Wednesday"},{"value":"sunday","label":"Sunday"},{"value":"monday","label":"Monday"}]', 'friday', 0.25, true),
  ('select_large', 'For this attention check, select “Large”.', '[{"value":"large","label":"Large"},{"value":"small","label":"Small"},{"value":"narrow","label":"Narrow"},{"value":"short","label":"Short"}]', 'large', 0.25, true),
  ('select_c', 'For this attention check, select “C”.', '[{"value":"c","label":"C"},{"value":"a","label":"A"},{"value":"b","label":"B"},{"value":"d","label":"D"}]', 'c', 0.25, true),
  ('select_third', 'For this attention check, select “Third”.', '[{"value":"third","label":"Third"},{"value":"first","label":"First"},{"value":"second","label":"Second"},{"value":"fourth","label":"Fourth"}]', 'third', 0.25, true),
  ('select_left', 'For this attention check, select “Left”.', '[{"value":"left","label":"Left"},{"value":"right","label":"Right"},{"value":"up","label":"Up"},{"value":"down","label":"Down"}]', 'left', 0.25, true),
  ('select_closed', 'For this attention check, select “Closed”.', '[{"value":"closed","label":"Closed"},{"value":"open","label":"Open"},{"value":"paused","label":"Paused"},{"value":"unknown","label":"Unknown"}]', 'closed', 0.25, true),
  ('select_tree', 'For this attention check, select “Tree”.', '[{"value":"tree","label":"Tree"},{"value":"stone","label":"Stone"},{"value":"water","label":"Water"},{"value":"house","label":"House"}]', 'tree', 0.25, true),
  ('select_stone', 'For this attention check, select “Stone”.', '[{"value":"stone","label":"Stone"},{"value":"soil","label":"Soil"},{"value":"sand","label":"Sand"},{"value":"steel","label":"Steel"}]', 'stone', 0.25, true),
  ('select_water', 'For this attention check, select “Water”.', '[{"value":"water","label":"Water"},{"value":"wood","label":"Wood"},{"value":"window","label":"Window"},{"value":"wall","label":"Wall"}]', 'water', 0.25, true),
  ('select_house', 'For this attention check, select “House”.', '[{"value":"house","label":"House"},{"value":"field","label":"Field"},{"value":"road","label":"Road"},{"value":"river","label":"River"}]', 'house', 0.25, true),
  ('select_zero', 'For this attention check, select “0”.', '[{"value":"zero","label":"0"},{"value":"one","label":"1"},{"value":"five","label":"5"},{"value":"ten","label":"10"}]', 'zero', 0.25, true),
  ('select_hexagon', 'For this attention check, select “Hexagon”.', '[{"value":"hexagon","label":"Hexagon"},{"value":"pentagon","label":"Pentagon"},{"value":"octagon","label":"Octagon"},{"value":"oval","label":"Oval"}]', 'hexagon', 0.25, true),
  ('select_white', 'For this attention check, select “White”.', '[{"value":"white","label":"White"},{"value":"black","label":"Black"},{"value":"gray","label":"Gray"},{"value":"beige","label":"Beige"}]', 'white', 0.25, true),
  ('select_true', 'For this attention check, select “True”.', '[{"value":"true","label":"True"},{"value":"false","label":"False"},{"value":"maybe","label":"Maybe"},{"value":"unknown","label":"Unknown"}]', 'true', 0.25, true),
  ('select_middle', 'For this attention check, select “Middle”.', '[{"value":"middle","label":"Middle"},{"value":"start","label":"Start"},{"value":"end","label":"End"},{"value":"edge","label":"Edge"}]', 'middle', 0.25, true)
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
