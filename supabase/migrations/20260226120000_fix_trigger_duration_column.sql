-- Fix trigger: use duration_seco (not duration_seconds) and recurrence_hidden_seco.
-- Run this if set_user_offer_expires fails with "record has no field duration_seconds".
-- Replaces both set_user_offer_expires_at (our migrations) and set_user_offer_expires (if it exists in DB).

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

-- If your trigger calls set_user_offer_expires() (without _at), replace that too:
create or replace function public.set_user_offer_expires()
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
