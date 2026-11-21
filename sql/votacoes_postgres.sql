begin;

create table public.votacao (
    id_votacao uuid primary key,
    titulo text not null check (char_length(btrim(titulo)) between 1 and 160),
    criada_em timestamptz not null default clock_timestamp(),
    encerrada_em timestamptz,
    check (encerrada_em is null or encerrada_em >= criada_em)
);

create unique index votacao_uma_aberta on public.votacao ((encerrada_em is null)) where encerrada_em is null;

create table public.opcao_votacao (
    id_votacao uuid not null references public.votacao on delete cascade,
    id_opcao smallint not null check (id_opcao between 1 and 4),
    nome text not null check (char_length(btrim(nome)) between 1 and 100),
    primary key (id_votacao, id_opcao),
    unique (id_votacao, nome)
);

create table public.voto (
    id_votacao uuid not null,
    id_opcao smallint not null,
    id_usuario uuid not null references auth.users (id) on delete cascade,
    primary key (id_votacao, id_usuario),
    foreign key (id_votacao, id_opcao) references public.opcao_votacao on delete cascade
);

create index on public.voto (id_votacao, id_opcao);
create index on public.voto (id_usuario);

alter table public.votacao enable row level security;
alter table public.opcao_votacao enable row level security;
alter table public.voto enable row level security;
revoke all on public.votacao, public.opcao_votacao, public.voto from public, anon, authenticated, service_role;

commit;
