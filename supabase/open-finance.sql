-- FinTrack + Open Finance: evolução do banco (execute DEPOIS do schema.sql)

-- 1) Conexões bancárias -------------------------------------------------
create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  pluggy_item_id text not null,
  institution_name text not null,
  institution_image_url text,
  status text not null default 'connected'
    check (status in ('connected', 'error')),
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, pluggy_item_id)
);

alter table public.bank_connections enable row level security;

create policy "Conexões: ler as próprias"
  on public.bank_connections for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Conexões: criar as próprias"
  on public.bank_connections for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Conexões: editar as próprias"
  on public.bank_connections for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Conexões: excluir as próprias"
  on public.bank_connections for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.bank_connections to authenticated;

-- 2) Lançamentos importados ---------------------------------------------
-- source: de onde veio o lançamento. external_id: id da transação no Pluggy.
-- A restrição UNIQUE impede importar a mesma transação duas vezes.
-- (Valores NULL não colidem: lançamentos manuais não são afetados.)
alter table public.transactions
  add column source text not null default 'manual'
    check (source in ('manual', 'open_finance')),
  add column connection_id uuid
    references public.bank_connections (id) on delete cascade,
  add column external_id text,
  add column account_name text,
  add constraint transactions_user_external_key unique (user_id, external_id);

create index transactions_connection_idx
  on public.transactions (connection_id);
