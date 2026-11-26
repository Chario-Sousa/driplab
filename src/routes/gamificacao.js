const { Router } = require('express');
const sequelize = require('../config/database');
const { autenticar } = require('../middleware/sessao');

const gamificacao = Router();
const codigoValido = codigo => typeof codigo === 'string' && /^[a-z0-9-]{1,64}$/.test(codigo);
const conquistas = [
  { origem: 'voto', titulo: 'Primeiro voto', descricao: 'Vote em uma enquete.' },
  { origem: 'comentario', titulo: 'Primeiro comentário', descricao: 'Publique um comentário na votação ou em um drop.' },
  { origem: 'pedido', titulo: 'Primeira compra confirmada', descricao: 'Tenha um pedido confirmado.' },
];

gamificacao.use(autenticar);
gamificacao.use((req, res, next) => {
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Gamificação indisponível neste ambiente.' });
  }
  next();
});

gamificacao.get('/', async (req, res) => {
  try {
    const [[dados]] = await sequelize.query(`
      with atividade as (
        select coalesce(sum(pontos), 0) as xp, coalesce(array_agg(distinct origem), array[]::text[]) as origens
        from public.credito_gamificacao where id_usuario = $1::uuid
      )
      select atividade.*, progresso.*,
        (select coalesce(sum(custo), 0) from public.resgate_recompensa where id_usuario = $1::uuid) as gasto,
        (select recompensa.titulo from public.resgate_recompensa resgate
         join public.recompensa on recompensa.codigo = resgate.codigo_recompensa
         where resgate.id_usuario = $1::uuid and resgate.titulo_ativo) as titulo,
        (select coalesce(jsonb_agg(jsonb_build_object(
            'codigo', r.codigo, 'titulo', r.titulo, 'descricao', r.descricao,
            'custo', r.custo, 'resgatada', s.id_resgate is not null,
            'desconto_percentual', r.desconto_percentual, 'usada', s.id_pedido is not null,
            'ultimo_resgate', s.id_resgate::text, 'titulo_ativo', coalesce(s.titulo_ativo, false),
            'origem_desbloqueio', r.origem_desbloqueio
          ) order by r.custo, r.codigo), '[]'::jsonb)
         from public.recompensa r
         left join lateral (
           select id_resgate, id_pedido, titulo_ativo from public.resgate_recompensa
           where id_usuario = $1::uuid and codigo_recompensa = r.codigo
           order by id_resgate desc limit 1
         ) s on true
        ) as recompensas
      from atividade cross join lateral public.progresso_gamificacao(atividade.xp) progresso
    `, { bind: [req.idUsuario] });
    const xp = Number(dados.xp);
    res.json({
      saldo: xp - Number(dados.gasto),
      xp,
      nivel: dados.nivel,
      progresso_xp: Number(dados.progresso_xp),
      xp_por_nivel: Number(dados.xp_por_nivel),
      titulo: dados.titulo,
      conquistas: conquistas.map(({ origem, titulo, descricao }) => ({
        titulo, descricao, desbloqueada: dados.origens.includes(origem),
        titulo_recompensa: dados.recompensas.find(recompensa => recompensa.origem_desbloqueio === origem)?.titulo ?? null,
      })),
      recompensas: dados.recompensas,
    });
  } catch (erro) {
    console.error('Falha ao carregar gamificação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar seu progresso.' });
  }
});

gamificacao.put('/recompensas/:codigo/resgate', async (req, res) => {
  const { codigo } = req.params;
  const ultimoResgate = req.body?.ultimo_resgate ?? null;
  if (!codigoValido(codigo) || (ultimoResgate !== null
      && (typeof ultimoResgate !== 'string' || !/^[1-9][0-9]{0,18}$/.test(ultimoResgate)))) {
    return res.status(400).json({ erro: 'Recompensa inválida.' });
  }

  try {
    const [[{ resultado }]] = await sequelize.query(
      'select public.resgatar_recompensa($1::uuid, $2, $3) as resultado',
      { bind: [req.idUsuario, codigo, ultimoResgate] }
    );
    if (resultado === 'inexistente') return res.status(404).json({ erro: 'Recompensa não encontrada.' });
    if (resultado === 'titulo_por_conquista') {
      return res.status(409).json({ erro: 'Esse título é liberado ao desbloquear a conquista correspondente.' });
    }
    if (resultado === 'saldo_insuficiente') return res.status(409).json({ erro: 'Você ainda não tem pontos suficientes.' });
    if (resultado === 'resgate_desatualizado') {
      return res.status(409).json({ erro: 'O estado da recompensa mudou. Confira os dados e tente de novo.' });
    }
    res.json({ resgatada: true, novo_resgate: resultado === 'resgatado' });
  } catch (erro) {
    console.error('Falha ao resgatar recompensa:', erro.name);
    res.status(500).json({ erro: 'Não foi possível resgatar a recompensa.' });
  }
});

gamificacao.put('/titulo', async (req, res) => {
  const codigo = req.body?.codigo;
  if (codigo !== null && !codigoValido(codigo)) {
    return res.status(400).json({ erro: 'Título inválido.' });
  }
  try {
    const [[{ atualizado }]] = await sequelize.query(
      'select public.definir_titulo_gamificacao($1::uuid, $2) as atualizado',
      { bind: [req.idUsuario, codigo] }
    );
    if (!atualizado) return res.status(409).json({ erro: 'Desbloqueie ou resgate esse título antes de usá-lo.' });
    res.status(204).end();
  } catch (erro) {
    console.error('Falha ao atualizar título:', erro.name);
    res.status(500).json({ erro: 'Não foi possível atualizar o título do perfil.' });
  }
});

module.exports = gamificacao;
