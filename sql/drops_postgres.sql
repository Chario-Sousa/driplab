alter table public.colecao
    alter column data_lancamento type timestamptz
        using data_lancamento at time zone 'America/Sao_Paulo',
    alter column data_encerramento type timestamptz
        using data_encerramento at time zone 'America/Sao_Paulo',
    add constraint periodo_colecao_valido
        check (data_encerramento is null or data_encerramento > data_lancamento);

alter table public.item_pedido add column id_colecao integer
    references public.colecao (id_colecao) on delete restrict;

update public.item_pedido i
set id_colecao = p.fk_colecao_id_colecao
from public.produto p
where p.id_produto = i.id_produto and p.fk_colecao_id_colecao is not null;

create index on public.item_pedido (id_colecao) where id_colecao is not null;

create view public.disponibilidade_drop with (security_invoker = true) as
with vendas as (
    select i.id_colecao, sum(i.quantidade) as pecas
    from public.item_pedido i
    join public.pedido p on p.id_pedido = i.id_pedido
    where i.id_colecao is not null and p.status in ('pendente', 'confirmado')
    group by i.id_colecao
), relogio as materialized (
    select clock_timestamp() as agora
)
select c.id_colecao, c.nome_colecao, c.data_lancamento, c.data_encerramento,
    c.limite_pecas, greatest(c.limite_pecas - coalesce(v.pecas, 0), 0)::integer as pecas_restantes,
    case
        when not c.ativa then 'inativo'
        when r.agora < c.data_lancamento then 'agendado'
        when c.data_encerramento is not null and r.agora >= c.data_encerramento then 'encerrado'
        when coalesce(v.pecas, 0) >= c.limite_pecas then 'esgotado'
        else 'em_andamento'
    end as estado
from public.colecao c
cross join relogio r
left join vendas v on v.id_colecao = c.id_colecao;

revoke all on public.disponibilidade_drop from public, anon, authenticated, service_role;

create or replace function public.criar_pedido(
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
    v_colecao record;
    v_id_colecao integer;
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

    perform p.id_produto
    from public.produto p
    join jsonb_to_recordset(v_itens) as item (id_produto integer, quantidade integer)
        on item.id_produto = p.id_produto
    order by p.id_produto
    for update of p;

    perform c.id_colecao
    from public.colecao c
    where c.id_colecao in (
        select p.fk_colecao_id_colecao
        from public.produto p
        join jsonb_to_recordset(v_itens) as item (id_produto integer, quantidade integer)
            on item.id_produto = p.id_produto
    )
    order by c.id_colecao
    for no key update of c;

    for v_colecao in
        select d.estado, d.pecas_restantes, sum(item.quantidade) as pedido_pecas
        from jsonb_to_recordset(v_itens) as item (id_produto integer, quantidade integer)
        join public.produto p on p.id_produto = item.id_produto
        join public.disponibilidade_drop d on d.id_colecao = p.fk_colecao_id_colecao
        group by d.id_colecao, d.estado, d.pecas_restantes
    loop
        if v_colecao.estado in ('agendado', 'encerrado', 'inativo') then
            raise exception 'drop_fora_do_periodo' using errcode = 'P0001';
        end if;

        if v_colecao.pedido_pecas > v_colecao.pecas_restantes then
            raise exception 'limite_do_drop' using errcode = 'P0001';
        end if;
    end loop;

    for v_item in
        select * from jsonb_to_recordset(v_itens) as item (id_produto integer, quantidade integer)
        order by id_produto
    loop
        select estoque, preco, fk_colecao_id_colecao into v_estoque, v_preco, v_id_colecao
        from public.produto
        where id_produto = v_item.id_produto;

        if not found then
            raise exception 'produto_nao_encontrado' using errcode = 'P0001';
        end if;

        if v_estoque < v_item.quantidade then
            raise exception 'estoque_insuficiente' using errcode = 'P0001';
        end if;

        update public.produto
        set estoque = estoque - v_item.quantidade
        where id_produto = v_item.id_produto;

        insert into public.item_pedido (id_pedido, id_produto, id_colecao, quantidade, preco_unitario)
        values (v_id_pedido, v_item.id_produto, v_id_colecao, v_item.quantidade, v_preco);

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
