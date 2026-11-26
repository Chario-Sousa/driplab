begin;

alter table public.colecao
    add column nivel_minimo integer not null default 1 check (nivel_minimo between 1 and 100);

create table public.credito_gamificacao (
    id_usuario uuid not null references auth.users (id) on delete cascade,
    origem text not null check (origem in ('voto', 'comentario', 'pedido')),
    referencia text not null,
    pontos integer not null check (pontos > 0),
    primary key (id_usuario, origem, referencia)
);

create table public.recompensa (
    codigo text primary key,
    titulo text not null,
    descricao text not null,
    custo integer not null check (custo >= 0),
    desconto_percentual integer check (desconto_percentual between 1 and 100),
    origem_desbloqueio text unique check (origem_desbloqueio in ('voto', 'comentario', 'pedido')),
    check ((origem_desbloqueio is null and custo > 0)
        or (origem_desbloqueio is not null and custo = 0 and desconto_percentual is null))
);

alter table public.pedido
    add column valor_desconto numeric(20,2) not null default 0 check (valor_desconto >= 0),
    add column codigo_recompensa text references public.recompensa (codigo);

create table public.resgate_recompensa (
    id_resgate bigint generated always as identity primary key,
    id_usuario uuid not null references auth.users (id) on delete cascade,
    codigo_recompensa text not null references public.recompensa (codigo),
    custo integer not null check (custo >= 0),
    resgatado_em timestamptz not null default clock_timestamp(),
    id_pedido bigint unique references public.pedido (id_pedido),
    titulo_ativo boolean not null default false,
    check (not titulo_ativo or id_pedido is null)
);

create index on public.resgate_recompensa (codigo_recompensa);
create index on public.resgate_recompensa (id_usuario, codigo_recompensa, id_resgate desc);
create unique index on public.resgate_recompensa (id_usuario, codigo_recompensa) where id_pedido is null;
create unique index on public.resgate_recompensa (id_usuario) where titulo_ativo;

alter table public.credito_gamificacao enable row level security;
alter table public.recompensa enable row level security;
alter table public.resgate_recompensa enable row level security;
revoke all on public.credito_gamificacao, public.recompensa, public.resgate_recompensa
    from public, anon, authenticated, service_role;
revoke all on sequence public.resgate_recompensa_id_resgate_seq from public, anon, authenticated, service_role;

insert into public.recompensa (codigo, titulo, descricao, custo, desconto_percentual, origem_desbloqueio) values
    ('voz-da-comunidade', 'Voz da Comunidade', 'Título que você pode exibir no seu perfil.', 30, null, null),
    ('colecionador', 'Colecionador DripLab', 'Título que você pode exibir no seu perfil.', 80, null, null),
    ('desconto-5', '5% de desconto', 'Aplique no total dos produtos de um pedido. Resgate novamente após usar.', 30, 5, null),
    ('desconto-10', '10% de desconto', 'Aplique no total dos produtos de um pedido. Resgate novamente após usar.', 50, 10, null),
    ('voz-da-enquete', 'Voz da Enquete', 'Desbloqueie com seu primeiro voto.', 0, null, 'voto'),
    ('voz-do-drop', 'Voz do Drop', 'Desbloqueie com seu primeiro comentário.', 0, null, 'comentario'),
    ('estreante-driplab', 'Estreante DripLab', 'Desbloqueie com sua primeira compra confirmada.', 0, null, 'pedido');

create function public.desbloquear_titulo_conquista()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    insert into public.resgate_recompensa (id_usuario, codigo_recompensa, custo)
    select new.id_usuario, codigo, custo
    from public.recompensa where origem_desbloqueio = new.origem
    on conflict (id_usuario, codigo_recompensa) where id_pedido is null do nothing;
    return new;
end;
$$;

revoke execute on function public.desbloquear_titulo_conquista() from public, anon, authenticated, service_role;

create trigger credito_desbloqueia_titulo after insert on public.credito_gamificacao
for each row execute function public.desbloquear_titulo_conquista();

create function public.registrar_credito_gamificacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_table_name = 'voto' then
        insert into public.credito_gamificacao values
            (new.id_usuario, 'voto', new.id_votacao::text, 20) on conflict do nothing;
    elsif tg_table_name = 'comentario_comunidade' then
        insert into public.credito_gamificacao values
            (new.id_usuario, 'comentario', 'primeiro', 10) on conflict do nothing;
    elsif new.status = 'confirmado' then
        insert into public.credito_gamificacao values
            (new.id_usuario, 'pedido', new.id_pedido::text, 50) on conflict do nothing;
    end if;
    return new;
end;
$$;

revoke execute on function public.registrar_credito_gamificacao() from public, anon, authenticated, service_role;

create trigger voto_credito_gamificacao after insert on public.voto
for each row execute function public.registrar_credito_gamificacao();

create trigger comentario_credito_gamificacao after insert on public.comentario_comunidade
for each row execute function public.registrar_credito_gamificacao();

create trigger pedido_credito_gamificacao after insert or update of status on public.pedido
for each row execute function public.registrar_credito_gamificacao();

insert into public.credito_gamificacao (id_usuario, origem, referencia, pontos)
select id_usuario, 'voto', id_votacao::text, 20 from public.voto
union all
select distinct id_usuario, 'comentario', 'primeiro', 10 from public.comentario_comunidade
union all
select id_usuario, 'pedido', id_pedido::text, 50 from public.pedido where status = 'confirmado'
on conflict do nothing;

create function public.resgatar_recompensa(p_usuario uuid, p_codigo text, p_ultimo_resgate text)
returns text
language plpgsql
set search_path = ''
as $$
declare
    custo_recompensa integer;
    saldo bigint;
    ultimo_id bigint;
    ultimo_pedido bigint;
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('driplab:resgate:' || p_usuario::text, 0));

    select custo into custo_recompensa from public.recompensa where codigo = p_codigo;
    if not found then return 'inexistente'; end if;
    if custo_recompensa = 0 then return 'titulo_por_conquista'; end if;

    select id_resgate, id_pedido into ultimo_id, ultimo_pedido
    from public.resgate_recompensa
    where id_usuario = p_usuario and codigo_recompensa = p_codigo
    order by id_resgate desc limit 1;

    if ultimo_id is not null and ultimo_pedido is null then return 'ja_resgatado'; end if;
    if ultimo_id::text is distinct from p_ultimo_resgate then return 'resgate_desatualizado'; end if;

    select
        coalesce((select sum(pontos) from public.credito_gamificacao where id_usuario = p_usuario), 0)
        - coalesce((select sum(custo) from public.resgate_recompensa where id_usuario = p_usuario), 0)
    into saldo;
    if saldo < custo_recompensa then return 'saldo_insuficiente'; end if;

    insert into public.resgate_recompensa (id_usuario, codigo_recompensa, custo)
    values (p_usuario, p_codigo, custo_recompensa);
    return 'resgatado';
end;
$$;

create function public.definir_titulo_gamificacao(p_usuario uuid, p_codigo text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
    resgate bigint;
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('driplab:resgate:' || p_usuario::text, 0));
    if p_codigo is not null then
        select s.id_resgate into resgate
        from public.resgate_recompensa s
        join public.recompensa r on r.codigo = s.codigo_recompensa
        where s.id_usuario = p_usuario and r.codigo = p_codigo and r.desconto_percentual is null
            and s.id_pedido is null;
        if not found then return false; end if;
    end if;

    update public.resgate_recompensa set titulo_ativo = false
    where id_usuario = p_usuario and titulo_ativo and id_resgate is distinct from resgate;
    update public.resgate_recompensa set titulo_ativo = true
    where id_resgate = resgate and not titulo_ativo;
    return true;
end;
$$;

revoke execute on function public.resgatar_recompensa(uuid, text, text),
    public.definir_titulo_gamificacao(uuid, text) from public, anon, authenticated, service_role;

create function public.xp_minimo_gamificacao(p_nivel integer)
returns bigint
language sql
immutable
strict
set search_path = ''
as $$
    select round(75 * power((p_nivel - 1)::double precision, 1.2))::bigint
$$;

create function public.progresso_gamificacao(p_xp bigint)
returns table (nivel integer, progresso_xp bigint, xp_por_nivel bigint)
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
    anterior bigint := 0;
    proximo bigint := public.xp_minimo_gamificacao(2);
begin
    nivel := 1;
    while p_xp >= proximo loop
        nivel := nivel + 1;
        anterior := proximo;
        proximo := public.xp_minimo_gamificacao(nivel + 1);
    end loop;
    progresso_xp := p_xp - anterior;
    xp_por_nivel := proximo - anterior;
    return next;
end;
$$;

create function public.validar_nivel_drop()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    minimo integer;
    xp bigint;
begin
    select nivel_minimo into minimo
    from public.colecao where id_colecao = new.id_colecao;

    if minimo > 1 then
        select coalesce(sum(c.pontos), 0) into xp
        from public.pedido p
        left join public.credito_gamificacao c on c.id_usuario = p.id_usuario
        where p.id_pedido = new.id_pedido;

        if xp < public.xp_minimo_gamificacao(minimo) then
            raise exception 'nivel_insuficiente' using detail = minimo::text;
        end if;
    end if;
    return new;
end;
$$;

create trigger item_pedido_nivel_drop before insert on public.item_pedido
for each row execute function public.validar_nivel_drop();

create function public.criar_pedido_com_recompensa(p_usuario uuid, p_chave uuid, p_itens jsonb, p_codigo text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
    pedido_anterior public.pedido%rowtype;
    pedido_criado bigint;
    percentual integer;
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('driplab:resgate:' || p_usuario::text, 0));

    select * into pedido_anterior
    from public.pedido where id_usuario = p_usuario and chave_solicitacao = p_chave;

    pedido_criado := public.criar_pedido(p_usuario, p_chave, p_itens);
    if pedido_anterior.id_pedido is not null then
        if pedido_anterior.codigo_recompensa is distinct from p_codigo then
            raise exception 'solicitacao_ja_utilizada';
        end if;
        return pedido_criado;
    end if;

    if p_codigo is not null then
        update public.resgate_recompensa s set id_pedido = pedido_criado
        from public.recompensa r
        where s.id_usuario = p_usuario and s.codigo_recompensa = p_codigo
            and s.id_pedido is null and r.codigo = s.codigo_recompensa
            and r.desconto_percentual is not null
        returning r.desconto_percentual into percentual;
        if not found then raise exception 'desconto_indisponivel'; end if;

        update public.pedido
        set valor_desconto = round(valor_total * percentual / 100, 2),
            valor_total = valor_total - round(valor_total * percentual / 100, 2),
            codigo_recompensa = p_codigo
        where id_pedido = pedido_criado;
    end if;
    return pedido_criado;
end;
$$;

revoke execute on function public.xp_minimo_gamificacao(integer), public.progresso_gamificacao(bigint),
    public.validar_nivel_drop(), public.criar_pedido_com_recompensa(uuid, uuid, jsonb, text)
    from public, anon, authenticated, service_role;

commit;
