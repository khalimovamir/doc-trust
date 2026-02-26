-- Recurring offer: show for duration_seco, then hide for recurrence_hidden_seco, then show again (e.g. "every other day").
-- subscription_offers: recurrence_hidden_seco (seconds to hide after current window ends).
-- user_offer_states: next_show_at (when the next show window can start).

alter table public.subscription_offers
  add column if not exists recurrence_hidden_seco int4;

alter table public.user_offer_states
  add column if not exists next_show_at timestamptz;

comment on column public.subscription_offers.recurrence_hidden_seco is 'Seconds to hide offer after expires_at; then next window can start (e.g. 86400 = show again next day).';
comment on column public.user_offer_states.next_show_at is 'For recurring offers: when the next show window starts (expires_at + recurrence_hidden_seco).';

-- Trigger: on insert set expires_at and, if recurring, next_show_at
create or replace function public.set_user_offer_expires_at()
returns trigger language plpgsql as $$
declare
  dur int4;
  hid int4;
begin
  select o.duration_seco, o.recurrence_hidden_seco into dur, hid
  from public.subscription_offers o
  where o.id = new.offer_id;
  if dur is not null and dur > 0 then
    new.expires_at := now() + (dur || ' seconds')::interval;
  end if;
  if hid is not null and hid > 0 and new.expires_at is not null then
    new.next_show_at := new.expires_at + (hid || ' seconds')::interval;
  end if;
  return new;
end;
$$;

drop trigger if exists set_user_offer_expires_at on public.user_offer_states;
create trigger set_user_offer_expires_at
  before insert on public.user_offer_states
  for each row execute function public.set_user_offer_expires_at();

-- RPC: start next show window for recurring offer (call when now() >= next_show_at)
create or replace function public.start_next_offer_window(p_offer_id uuid)
returns setof public.user_offer_states
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_dur int4;
  v_hid int4;
  v_row public.user_offer_states;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  select duration_seco, recurrence_hidden_seco into v_dur, v_hid
  from public.subscription_offers
  where id = p_offer_id and is_active = true;
  if v_dur is null or v_dur <= 0 or v_hid is null or v_hid <= 0 then
    return;
  end if;

  select * into v_row
  from public.user_offer_states
  where user_id = v_user_id and offer_id = p_offer_id;

  if v_row.id is null then
    insert into public.user_offer_states (user_id, offer_id)
    values (v_user_id, p_offer_id)
    returning * into v_row;
    return next v_row;
    return;
  end if;

  if v_row.next_show_at is null or now() < v_row.next_show_at then
    return next v_row;
    return;
  end if;

  update public.user_offer_states
  set
    expires_at = now() + (v_dur || ' seconds')::interval,
    next_show_at = now() + (v_dur + v_hid || ' seconds')::interval
  where user_id = v_user_id and offer_id = p_offer_id;

  select * into v_row from public.user_offer_states where user_id = v_user_id and offer_id = p_offer_id;
  return next v_row;
end;
$$;
