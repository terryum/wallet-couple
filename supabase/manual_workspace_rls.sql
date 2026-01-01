-- Manual migration for workspace + member + RLS (run in Supabase SQL editor)
-- Phase A: schema + backfill (safe before auth wiring)
-- Phase B: RLS policies (enable only after auth is wired)

-- === Phase A: workspace + member tables ===
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now()
);

create unique index if not exists idx_workspace_members_unique
  on workspace_members(workspace_id, user_id);

-- === Phase A: add workspace_id to existing tables ===
alter table if exists transactions
  add column if not exists workspace_id uuid;

alter table if exists uploaded_files
  add column if not exists workspace_id uuid;

alter table if exists category_mappings
  add column if not exists workspace_id uuid;

alter table if exists merchant_name_mappings
  add column if not exists workspace_id uuid;

alter table if exists action_history
  add column if not exists workspace_id uuid;

-- Attach FK constraints if missing
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_workspace_id_fkey'
  ) then
    alter table transactions
      add constraint transactions_workspace_id_fkey
      foreign key (workspace_id) references workspaces(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'uploaded_files_workspace_id_fkey'
  ) then
    alter table uploaded_files
      add constraint uploaded_files_workspace_id_fkey
      foreign key (workspace_id) references workspaces(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'category_mappings_workspace_id_fkey'
  ) then
    alter table category_mappings
      add constraint category_mappings_workspace_id_fkey
      foreign key (workspace_id) references workspaces(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'merchant_name_mappings_workspace_id_fkey'
  ) then
    alter table merchant_name_mappings
      add constraint merchant_name_mappings_workspace_id_fkey
      foreign key (workspace_id) references workspaces(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'action_history_workspace_id_fkey'
  ) then
    alter table action_history
      add constraint action_history_workspace_id_fkey
      foreign key (workspace_id) references workspaces(id) on delete set null;
  end if;
end $$;

-- Backfill workspace_id with a default workspace
do $$
declare
  default_workspace_id uuid;
begin
  if not exists (select 1 from workspaces) then
    insert into workspaces (name) values ('default');
  end if;

  select id into default_workspace_id
  from workspaces
  order by created_at asc
  limit 1;

  update transactions set workspace_id = default_workspace_id where workspace_id is null;
  update uploaded_files set workspace_id = default_workspace_id where workspace_id is null;
  update category_mappings set workspace_id = default_workspace_id where workspace_id is null;
  update merchant_name_mappings set workspace_id = default_workspace_id where workspace_id is null;
  update action_history set workspace_id = default_workspace_id where workspace_id is null;
end $$;

-- Optional: new unique index with workspace_id (keep old one for now)
create unique index if not exists idx_transactions_unique_workspace
  on transactions(workspace_id, transaction_date, merchant_name, amount, source_type, owner)
  where is_deleted = false;

-- === Phase B: RLS (enable after auth wiring) ===
-- Enable RLS
-- alter table workspaces enable row level security;
-- alter table workspace_members enable row level security;
-- alter table transactions enable row level security;
-- alter table uploaded_files enable row level security;
-- alter table category_mappings enable row level security;
-- alter table merchant_name_mappings enable row level security;
-- alter table action_history enable row level security;

-- Basic policies (member-based access)
-- create policy workspaces_select on workspaces
--   for select using (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = workspaces.id
--         and wm.user_id = auth.uid()
--     )
--   );
--
-- create policy workspace_members_select on workspace_members
--   for select using (user_id = auth.uid());
--
-- create policy transactions_access on transactions
--   for all using (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = transactions.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   ) with check (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = transactions.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   );
--
-- create policy uploaded_files_access on uploaded_files
--   for all using (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = uploaded_files.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   ) with check (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = uploaded_files.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   );
--
-- create policy category_mappings_access on category_mappings
--   for all using (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = category_mappings.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   ) with check (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = category_mappings.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   );
--
-- create policy merchant_name_mappings_access on merchant_name_mappings
--   for all using (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = merchant_name_mappings.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   ) with check (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = merchant_name_mappings.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   );
--
-- create policy action_history_access on action_history
--   for all using (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = action_history.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   ) with check (
--     exists (
--       select 1 from workspace_members wm
--       where wm.workspace_id = action_history.workspace_id
--         and wm.user_id = auth.uid()
--     )
--   );
