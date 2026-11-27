begin;

alter table public.votacao
    add column oculta_em timestamptz,
    add constraint votacao_oculta_encerrada check (oculta_em is null or encerrada_em is not null);

commit;
