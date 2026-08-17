-- JobTrack authentication and authorization setup
-- Run this in the Supabase SQL Editor before enabling the new UI.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (role in ('admin','viewer'));

alter table public.jobs enable row level security;

drop policy if exists "Authenticated users can view jobs" on public.jobs;
create policy "Authenticated users can view jobs"
on public.jobs for select
to authenticated
using (true);

drop policy if exists "Admins can insert jobs" on public.jobs;
create policy "Admins can insert jobs"
on public.jobs for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update jobs" on public.jobs;
create policy "Admins can update jobs"
on public.jobs for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete jobs" on public.jobs;
create policy "Admins can delete jobs"
on public.jobs for delete
to authenticated
using (public.is_admin());

-- IMPORTANT: after creating your own Auth user, promote it once in SQL Editor:
-- update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
