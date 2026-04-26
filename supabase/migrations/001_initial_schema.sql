-- ============================================================
-- ChapterLedger — Initial Schema Migration
-- Run this in the Supabase SQL Editor or via: supabase db push
-- ============================================================

-- PROFILES: linked to Supabase auth.users
create table if not exists profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('member', 'exec'))
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- BUDGET_CATEGORIES
create table if not exists budget_categories (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  allocated_amount numeric(10,2) not null default 0,
  semester         text not null
);

-- EXPENSES
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references budget_categories(id) on delete restrict,
  amount      numeric(10,2) not null,
  description text not null,
  date        date not null default current_date,
  logged_by   uuid not null references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- MEMBERS_DUES
create table if not exists members_dues (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  amount_owed  numeric(10,2) not null default 0,
  amount_paid  numeric(10,2) not null default 0,
  semester     text not null,
  unique (profile_id, semester)
);

-- SUGGESTIONS (no user_id stored — fully anonymous)
create table if not exists suggestions (
  id         uuid primary key default gen_random_uuid(),
  anon_name  text not null,
  body       text not null,
  category   text not null default 'General',
  status     text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  vote_count integer not null default 0,
  flagged    boolean not null default false,
  created_at timestamptz not null default now()
);

-- VOTES (vote_token = SHA-256 browser fingerprint — never user_id)
create table if not exists votes (
  id            uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references suggestions(id) on delete cascade,
  vote_token    text not null,
  created_at    timestamptz not null default now(),
  unique (suggestion_id, vote_token)
);

-- Atomic vote increment (called from /api/votes route handler)
create or replace function increment_vote_count(suggestion_id_param uuid)
returns void language sql security definer as $$
  update suggestions
  set vote_count = vote_count + 1
  where id = suggestion_id_param;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles          enable row level security;
alter table budget_categories enable row level security;
alter table expenses          enable row level security;
alter table members_dues      enable row level security;
alter table suggestions       enable row level security;
alter table votes             enable row level security;

-- PROFILES
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Exec can read all profiles" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);
create policy "Exec can read all profiles" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );

-- BUDGET_CATEGORIES
drop policy if exists "All authenticated read budget_categories" on budget_categories;
drop policy if exists "Exec can insert budget_categories" on budget_categories;
drop policy if exists "Exec can update budget_categories" on budget_categories;
create policy "All authenticated read budget_categories" on budget_categories
  for select using (auth.role() = 'authenticated');
create policy "Exec can insert budget_categories" on budget_categories
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );
create policy "Exec can update budget_categories" on budget_categories
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );

-- EXPENSES
drop policy if exists "All authenticated read expenses" on expenses;
drop policy if exists "Exec can insert expenses" on expenses;
create policy "All authenticated read expenses" on expenses
  for select using (auth.role() = 'authenticated');
create policy "Exec can insert expenses" on expenses
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );

-- MEMBERS_DUES
drop policy if exists "Exec can read all dues" on members_dues;
drop policy if exists "Member reads own dues" on members_dues;
drop policy if exists "Exec can manage dues" on members_dues;
create policy "Exec can read all dues" on members_dues
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );
create policy "Member reads own dues" on members_dues
  for select using (profile_id = auth.uid());
create policy "Exec can manage dues" on members_dues
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );

-- SUGGESTIONS
drop policy if exists "All authenticated read suggestions" on suggestions;
drop policy if exists "Authenticated can insert suggestions" on suggestions;
drop policy if exists "Exec can update suggestions" on suggestions;
create policy "All authenticated read suggestions" on suggestions
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert suggestions" on suggestions
  for insert with check (auth.role() = 'authenticated');
create policy "Exec can update suggestions" on suggestions
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'exec')
  );

-- VOTES
drop policy if exists "All authenticated read votes" on votes;
drop policy if exists "Authenticated can insert votes" on votes;
create policy "All authenticated read votes" on votes
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert votes" on votes
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA (runs only if tables are empty)
-- ============================================================

do $$
declare semester_label text := 'Spring 2026';
begin
  if not exists (select 1 from budget_categories) then
    insert into budget_categories (name, allocated_amount, semester) values
      ('Social',           3500, semester_label),
      ('National Dues',    4200, semester_label),
      ('Housing',          6000, semester_label),
      ('Philanthropy',     1500, semester_label),
      ('Brotherhood/Misc',  800, semester_label);
  end if;

  if not exists (select 1 from suggestions) then
    insert into suggestions (anon_name, body, category, status, vote_count) values
      ('Anonymous Owl',
       'We should allocate more budget to philanthropy events this semester.',
       'Philanthropy', 'pending', 12),
      ('Anonymous Bear',
       'Can we get a discount on national dues for brothers with financial hardship?',
       'National Dues', 'pending', 7),
      ('Anonymous Falcon',
       'Suggest a chapter-wide cookout as a low-cost brotherhood event.',
       'Brotherhood/Misc', 'approved', 19),
      ('Anonymous Fox',
       'Consider splitting housing costs more transparently in the budget breakdown.',
       'Housing', 'pending', 4);
  end if;
end;
$$;

-- ============================================================
-- DEMO: After creating users in Supabase Auth dashboard, seed dues:
-- The handle_new_user trigger creates profile rows automatically.
-- Then run:
--
-- INSERT INTO members_dues (profile_id, amount_owed, amount_paid, semester)
-- SELECT id,
--   450.00,
--   CASE WHEN role = 'exec' THEN 450.00 ELSE 200.00 END,
--   'Spring 2026'
-- FROM profiles;
-- ============================================================
