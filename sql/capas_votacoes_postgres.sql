begin;

alter table public.opcao_votacao
    add column capa bytea,
    add column capa_tipo text,
    add constraint opcao_votacao_capa_valida check (
        (capa is null and capa_tipo is null)
        or (capa is not null and capa_tipo is not null
            and capa_tipo in ('image/jpeg', 'image/png', 'image/webp')
            and octet_length(capa) between 1 and 1048576)
    );

commit;
