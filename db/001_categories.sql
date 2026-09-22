-- Categorias de equipamento + preço mensal de referência (aluguel) para o comparativo "Ter × Alugar".
-- Idempotente: pode rodar mais de uma vez sem duplicar.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_price_cents integer not null default 0,   -- 0 = sem comparativo (ex.: semi-elétrica)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Vínculo do equipamento à categoria (opcional). Sem categoria => não entra no comparativo.
alter table equipment
  add column if not exists category_id uuid references categories(id) on delete set null;

-- Categorias iniciais (só insere se ainda não existirem, pelo nome).
insert into categories (name, monthly_price_cents, is_active) values
  ('Empilhadeira semi-elétrica',        0, true),
  ('Empilhadeira patolada',        300000, true),
  ('Empilhadeira retrátil',        550000, true),
  ('Empilhadeira contrabalançada', 500000, true),
  ('Paleteira tracionada',         200000, true)
on conflict (name) do nothing;
