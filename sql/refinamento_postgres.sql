begin;

create table public.perfil_avatar (
    id_usuario uuid primary key references auth.users (id) on delete cascade,
    id_avatar uuid not null unique default gen_random_uuid(),
    imagem bytea not null check (octet_length(imagem) between 1 and 1048576),
    tipo text not null check (tipo in ('image/png', 'image/jpeg', 'image/webp'))
);

alter table public.perfil_avatar enable row level security;
revoke all on public.perfil_avatar from public, anon, authenticated, service_role;

alter table public.comentario_comunidade
    drop constraint comentario_comunidade_check,
    add column id_produto integer references public.produto (id_produto) on delete cascade,
    add column editado_em timestamptz,
    add column texto_original text check (char_length(btrim(texto_original)) between 1 and 500),
    add constraint comentario_um_alvo check (num_nonnulls(id_votacao, id_colecao, id_produto) = 1);

create index on public.comentario_comunidade (id_produto, id_comentario desc) where id_produto is not null;

alter table public.produto add column imagem_detalhe_url text;

update public.produto
set imagem_detalhe_url = replace(imagem_url, '.png', '-detalhe.png')
where imagem_url in ('/imagens/produtos/tshirt-logo.png', '/imagens/produtos/moletom-essential.png',
    '/imagens/produtos/cargo-pants.png', '/imagens/produtos/bone-driplab.png', '/imagens/produtos/jaqueta-tech.png');

commit;
