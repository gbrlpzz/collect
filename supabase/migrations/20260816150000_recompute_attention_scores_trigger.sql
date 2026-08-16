-- Automatic attention score computation trigger on attention_responses.
-- Recomputes contributor_profiles attention_score, attention_checks_total,
-- attention_correct_total, and attention_last_at whenever responses are added or updated.

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
  if target_user is null then
    return;
  end if;

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

  insert into public.contributor_profiles (
    user_id, attention_score, attention_checks_total, attention_correct_total, attention_last_at
  ) values (
    target_user, round(score * 100, 2), total, observed, now()
  )
  on conflict (user_id) do update
  set attention_score = excluded.attention_score,
      attention_checks_total = excluded.attention_checks_total,
      attention_correct_total = excluded.attention_correct_total,
      attention_last_at = excluded.attention_last_at;
end;
$$;

create or replace function private.on_attention_response_change()
returns trigger
language plpgsql security definer set search_path = public, private, pg_catalog
as $$
begin
  if (tg_op = 'DELETE') then
    perform private.recompute_attention_score(old.contributor_id);
    return old;
  elsif (tg_op = 'UPDATE') then
    if (old.contributor_id is distinct from new.contributor_id) then
      perform private.recompute_attention_score(old.contributor_id);
    end if;
    perform private.recompute_attention_score(new.contributor_id);
    return new;
  else
    perform private.recompute_attention_score(new.contributor_id);
    return new;
  end if;
end;
$$;

drop trigger if exists attention_responses_recompute_score on public.attention_responses;
create trigger attention_responses_recompute_score
after insert or update or delete on public.attention_responses
for each row execute function private.on_attention_response_change();

-- Backfill existing contributor attention scores if responses exist
do $$
declare
  u record;
begin
  for u in select distinct contributor_id from public.attention_responses loop
    perform private.recompute_attention_score(u.contributor_id);
  end loop;
end;
$$;
