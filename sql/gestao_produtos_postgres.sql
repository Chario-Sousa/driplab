begin;

alter table public.produto
    add column ativo boolean not null default true,
    add column versao integer not null default 1,
    add column chave_criacao uuid unique,
    add column foto bytea,
    add column foto_tipo text,
    add constraint produto_foto_valida check (
        (foto is null and foto_tipo is null)
        or (foto is not null and foto_tipo is not null
            and foto_tipo in ('image/png', 'image/jpeg', 'image/webp')
            and octet_length(foto) between 1 and 1048576)
    );

alter table public.item_pedido
    add column nome_produto varchar(150),
    add column id_produto_catalogo integer references public.produto (id_produto) on delete set null;

update public.item_pedido i
set nome_produto = p.nome_produto, id_produto_catalogo = p.id_produto
from public.produto p
where p.id_produto = i.id_produto;

alter table public.item_pedido
    alter column nome_produto set not null,
    drop constraint item_pedido_id_produto_fkey,
    add constraint item_pedido_catalogo_valido check (id_produto_catalogo is null or id_produto_catalogo = id_produto);

create index on public.item_pedido (id_produto_catalogo) where id_produto_catalogo is not null;

create function public.gravar_produto_no_pedido()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    select p.nome_produto into new.nome_produto
    from public.produto p
    where p.id_produto = new.id_produto and p.ativo
    for share;

    if not found then
        raise exception 'produto_nao_encontrado' using errcode = 'P0001';
    end if;

    new.id_produto_catalogo := new.id_produto;
    return new;
end;
$$;

create trigger item_pedido_gravar_produto
before insert on public.item_pedido
for each row execute function public.gravar_produto_no_pedido();

create function public.atualizar_versao_produto()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' then
        new.versao := old.versao + 1;
        if old.foto is not distinct from new.foto and old.foto_tipo is not distinct from new.foto_tipo then
            return new;
        end if;
    end if;

    if new.foto is not null then
        new.imagem_url := '/api/produtos/' || new.id_produto || '/foto';
        new.imagem_detalhe_url := null;
    elsif tg_op = 'UPDATE' then
        new.imagem_url := null;
        new.imagem_detalhe_url := null;
    end if;
    return new;
end;
$$;

create trigger produto_atualizar_versao
before insert or update on public.produto
for each row execute function public.atualizar_versao_produto();

revoke all on function public.gravar_produto_no_pedido(), public.atualizar_versao_produto()
from public, anon, authenticated, service_role;

commit;
