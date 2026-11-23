begin;

create table public.comentario_comunidade (
    id_comentario integer generated always as identity primary key,
    id_usuario uuid not null references auth.users (id) on delete cascade,
    id_votacao uuid references public.votacao (id_votacao) on delete cascade,
    id_colecao integer references public.colecao (id_colecao) on delete cascade,
    chave_publicacao uuid not null,
    autor text not null check (char_length(btrim(autor)) between 1 and 80),
    texto text not null check (char_length(btrim(texto)) between 1 and 500),
    publicado_em timestamptz not null default now(),
    unique (id_usuario, chave_publicacao),
    check ((id_votacao is null) <> (id_colecao is null))
);

create index on public.comentario_comunidade (id_votacao, id_comentario desc) where id_votacao is not null;
create index on public.comentario_comunidade (id_colecao, id_comentario desc) where id_colecao is not null;

alter table public.comentario_comunidade enable row level security;
revoke all on public.comentario_comunidade from public, anon, authenticated, service_role;
revoke all on sequence public.comentario_comunidade_id_comentario_seq from public, anon, authenticated, service_role;

commit;
