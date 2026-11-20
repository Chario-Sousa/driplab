create table public.pedido (
    id_pedido bigint generated always as identity primary key,
    id_usuario uuid not null references auth.users (id) on delete restrict,
    chave_solicitacao uuid not null,
    data_pedido timestamptz not null default now(),
    status varchar(30) not null default 'pendente'
        check (status in ('pendente', 'confirmado', 'cancelado')),
    valor_total numeric(20, 2) not null default 0 check (valor_total >= 0),
    unique (id_usuario, chave_solicitacao)
);

create table public.item_pedido (
    id_pedido bigint not null references public.pedido (id_pedido) on delete restrict,
    id_produto integer not null references public.produto (id_produto) on delete restrict,
    quantidade integer not null check (quantidade > 0),
    preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
    primary key (id_pedido, id_produto)
);

create index on public.pedido (id_usuario, data_pedido desc, id_pedido desc);
create index on public.item_pedido (id_produto);

alter table public.pedido enable row level security;
alter table public.item_pedido enable row level security;

revoke all on public.pedido, public.item_pedido from public, anon, authenticated, service_role;
revoke all on sequence public.pedido_id_pedido_seq from public, anon, authenticated, service_role;

create function public.criar_pedido(
    p_id_usuario uuid,
    p_chave_solicitacao uuid,
    p_itens jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_id_pedido bigint;
    v_itens jsonb;
    v_itens_salvos jsonb;
    v_itens_validos boolean;
    v_item record;
    v_estoque integer;
    v_preco numeric(10, 2);
    v_total numeric(20, 2) := 0;
begin
    if p_id_usuario is null or p_chave_solicitacao is null
        or jsonb_typeof(p_itens) is distinct from 'array' then
        raise exception 'pedido_invalido' using errcode = '22023';
    end if;

    select jsonb_agg(jsonb_build_object(
        'id_produto', item.id_produto, 'quantidade', item.quantidade
    ) order by item.id_produto),
        count(*) = count(distinct item.id_produto)
        and bool_and(coalesce(item.id_produto > 0 and item.quantidade > 0, false))
    into v_itens, v_itens_validos
    from jsonb_to_recordset(p_itens) as item (id_produto integer, quantidade integer);

    if v_itens_validos is not true then
        raise exception 'itens_invalidos' using errcode = '22023';
    end if;

    insert into public.pedido (id_usuario, chave_solicitacao)
    values (p_id_usuario, p_chave_solicitacao)
    on conflict (id_usuario, chave_solicitacao) do nothing
    returning id_pedido into v_id_pedido;

    if v_id_pedido is null then
        select pedido.id_pedido into v_id_pedido
        from public.pedido
        where id_usuario = p_id_usuario and chave_solicitacao = p_chave_solicitacao;

        select jsonb_agg(jsonb_build_object(
            'id_produto', id_produto, 'quantidade', quantidade
        ) order by id_produto)
        into v_itens_salvos
        from public.item_pedido
        where id_pedido = v_id_pedido;

        if v_itens_salvos is distinct from v_itens then
            raise exception 'solicitacao_ja_utilizada' using errcode = '22023';
        end if;

        return v_id_pedido;
    end if;

    for v_item in
        select * from jsonb_to_recordset(v_itens) as item (id_produto integer, quantidade integer)
        order by id_produto
    loop
        select estoque, preco into v_estoque, v_preco
        from public.produto
        where id_produto = v_item.id_produto
        for update;

        if not found then
            raise exception 'produto_nao_encontrado' using errcode = 'P0001';
        end if;

        if v_estoque < v_item.quantidade then
            raise exception 'estoque_insuficiente' using errcode = 'P0001';
        end if;

        update public.produto
        set estoque = estoque - v_item.quantidade
        where id_produto = v_item.id_produto;

        insert into public.item_pedido (id_pedido, id_produto, quantidade, preco_unitario)
        values (v_id_pedido, v_item.id_produto, v_item.quantidade, v_preco);

        v_total := v_total + v_preco * v_item.quantidade;
    end loop;

    update public.pedido
    set valor_total = v_total
    where id_pedido = v_id_pedido;

    return v_id_pedido;
end;
$$;

revoke all on function public.criar_pedido(uuid, uuid, jsonb)
    from public, anon, authenticated, service_role;
