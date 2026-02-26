-- New users: do not set full_name from metadata/email; leave it empty.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, null);
  return new;
end;
$$ language plpgsql security definer;
