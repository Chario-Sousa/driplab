begin;

create table public.administrador (
    id_usuario uuid primary key references auth.users (id) on delete cascade
);

alter table public.administrador enable row level security;
revoke all on public.administrador from public, anon, authenticated, service_role;

alter table public.colecao
    add column versao integer not null default 1,
    add column chave_criacao uuid unique,
    add column capa bytea,
    add column capa_tipo text,
    add constraint colecao_capa_valida check (
        (capa is null and capa_tipo is null)
        or (capa is not null and capa_tipo is not null
            and capa_tipo in ('image/jpeg', 'image/png', 'image/webp')
            and octet_length(capa) between 1 and 1048576)
    );

commit;
