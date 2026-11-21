begin;

create table public.favorito (
    id_usuario uuid not null references auth.users (id) on delete cascade,
    id_produto integer not null references public.produto (id_produto) on delete cascade,
    criado_em timestamptz not null default now(),
    primary key (id_usuario, id_produto)
);

create index on public.favorito (id_produto);

alter table public.favorito enable row level security;
revoke all on public.favorito from public, anon, authenticated, service_role;

commit;
