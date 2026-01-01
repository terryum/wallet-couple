-- Phase B: enable RLS + policies (run in Supabase SQL editor)
-- NOTE: These policies preserve current behavior by allowing anon access
-- when auth.uid() is null, while also supporting workspace-based access.

-- Enable RLS
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table transactions enable row level security;
alter table uploaded_files enable row level security;
alter table category_mappings enable row level security;
alter table merchant_name_mappings enable row level security;
alter table action_history enable row level security;

-- Workspaces
drop policy if exists workspaces_access on workspaces;
create policy workspaces_access on workspaces
  for all using (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
    )
  );

-- Workspace members
drop policy if exists workspace_members_access on workspace_members;
create policy workspace_members_access on workspace_members
  for all using (
    auth.uid() is null
    or user_id = auth.uid()
  ) with check (
    auth.uid() is null
    or user_id = auth.uid()
  );

-- Transactions
drop policy if exists transactions_access on transactions;
create policy transactions_access on transactions
  for all using (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = transactions.workspace_id
        and wm.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = transactions.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Uploaded files
drop policy if exists uploaded_files_access on uploaded_files;
create policy uploaded_files_access on uploaded_files
  for all using (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = uploaded_files.workspace_id
        and wm.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = uploaded_files.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Category mappings
drop policy if exists category_mappings_access on category_mappings;
create policy category_mappings_access on category_mappings
  for all using (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = category_mappings.workspace_id
        and wm.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = category_mappings.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Merchant name mappings
drop policy if exists merchant_name_mappings_access on merchant_name_mappings;
create policy merchant_name_mappings_access on merchant_name_mappings
  for all using (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = merchant_name_mappings.workspace_id
        and wm.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = merchant_name_mappings.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Action history
drop policy if exists action_history_access on action_history;
create policy action_history_access on action_history
  for all using (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = action_history.workspace_id
        and wm.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is null
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = action_history.workspace_id
        and wm.user_id = auth.uid()
    )
  );
