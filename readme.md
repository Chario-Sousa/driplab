# DripLab

Plataforma web de streetwear digital-first, com catálogo de produtos, drops e recursos de interação com a comunidade.

## Links

- **Site publicado:** [https://chario-sousa.github.io/driplab/](https://chario-sousa.github.io/driplab/)
- **Repositório GitHub:** [https://github.com/Chario-Sousa/driplab](https://github.com/Chario-Sousa/driplab)

> **Sobre a demonstração publicada:** o catálogo do GitHub Pages usa dados demonstrativos e o carrinho funciona no navegador. A versão integrada usa a API Express com o PostgreSQL do Supabase.

## Objetivo do sistema

A DripLab é uma plataforma de streetwear criada para apresentar produtos e coleções de uma marca digital-first. A proposta combina a experiência de catálogo de uma loja virtual com telas para comunidade e interação.

## Funcionalidades

- Página inicial com catálogo demonstrativo de cinco produtos.
- Adição de produtos ao carrinho.
- Alteração de quantidades e remoção de itens.
- Cálculo do subtotal, frete e total do carrinho.
- Telas de coleções, cadastro, login e perfil.
- Cadastro e login por e-mail, sessão persistente e perfil com dados da conta via Supabase Auth na versão Express.
- Finalização do carrinho e histórico de pedidos da conta no perfil da versão Express.
- Contagem regressiva, período de venda e limite de peças por drop na versão Express.
- API local para verificar a conexão com o banco e consultar produtos.

### Limitações atuais

- No site publicado, os produtos são estáticos e não vêm do banco de dados.
- A API possui os endpoints `GET /api/health` e `GET /api/produtos`.
- A demonstração do GitHub Pages usa as telas estáticas de cadastro e login.
- O carrinho da demonstração do GitHub Pages funciona só no navegador.
- Votação, comentários e gamificação estão representados na proposta e nas telas, mas não estão integrados à API.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- Sequelize e PostgreSQL no Supabase
- MySQL e `mysql2` para execução local com o banco original
- Git e GitHub
- GitHub Pages para publicação da demonstração estática

## Banco de dados e modelagem

O catálogo no Supabase usa as tabelas `categoria`, `colecao` e `produto`. As tabelas `pedido` e `item_pedido` registram os pedidos vinculados ao Supabase Auth e preservam o preço de cada item. A função `criar_pedido` usa o estoque e os preços do banco ao registrar o pedido. O modelo completo do banco original MySQL `driplab_db` contém 14 tabelas:

`usuario`, `colecao`, `categoria`, `conquista`, `votacao`, `recompensa`, `produto`, `pedido`, `comentario`, `favorita`, `ganha`, `contem`, `participa` e `resgate`.

### Scripts SQL

- [Migração do catálogo para PostgreSQL e dados de exemplo](sql/catalogo_postgres.sql)
- [Migração de pedidos e baixa de estoque](sql/pedidos_postgres.sql)
- [Migração de favoritos por conta](sql/favoritos_postgres.sql)
- [Migração dos períodos e limites de drops](sql/drops_postgres.sql)
- [Criação do banco original no MySQL](sql/criar_banco.sql)
- [Inserção dos dados de teste no MySQL](sql/inserir_dados.sql)

### Modelagem

- [Modelo conceitual — arquivo do brModelo](docs/dripconceito.xml)
- [Modelo lógico — arquivo do brModelo](docs/driplogico.xml)
- Diagrama Entidade-Relacionamento (DER):

![Diagrama Entidade-Relacionamento do banco DripLab](docs/der.png)

## Execução com Supabase

1. Instale as dependências com `npm ci`.
2. Em um projeto Supabase novo, aplique `sql/catalogo_postgres.sql`, `sql/pedidos_postgres.sql`, `sql/drops_postgres.sql` e `sql/favoritos_postgres.sql`, nessa ordem.
3. No Supabase, abra **Connect** e copie a URI do **Transaction pooler**. Preencha a senha do banco na URI e use codificação de URL para caracteres especiais da senha.
4. Adicione `DATABASE_URL` ao arquivo local `.env` com a URI preenchida. Mantenha esse arquivo fora do Git.
5. Rode `npm start` e confira [a conexão](http://localhost:3000/api/health) e [os produtos](http://localhost:3000/api/produtos). Depois, abra [o site local](http://localhost:3000/).

Para publicar na Vercel, importe o repositório como um projeto Express e configure `DATABASE_URL` como variável privada no ambiente usado pelo deploy. Teste `/api/health` e `/api/produtos` no endereço publicado antes de validar o catálogo no navegador.

### Cadastro e login

O `npm ci` prepara o SDK do Supabase para as páginas de autenticação. O login usa o e-mail e a senha da conta. O nome de exibição aparece no perfil.

Em **Authentication → URL Configuration** no Supabase, configure o endereço principal do site como **Site URL** e adicione o endereço completo de `perfil.html` à lista **Redirect URLs**. Para testar no navegador local, adicione também `http://localhost:3000/perfil.html`.

Com a confirmação de e-mail ativada, use um endereço da equipe para testar com o serviço de e-mail padrão do Supabase. Configure [SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp) para enviar confirmações a clientes de fora da equipe.

### Pedidos

Abra o catálogo, adicione um produto, entre na sua conta e clique em **Finalizar compra**. O pedido aparece como **Pendente** no perfil. O total corresponde aos produtos. Estoque, preços e identidade do cliente são conferidos pelo servidor.

`POST /api/pedidos` recebe `chave_solicitacao` (UUID) e `itens` com `id_produto` e `quantidade`. Reenvie a mesma chave ao repetir a tentativa com os mesmos itens. `GET /api/pedidos` retorna o histórico do usuário autenticado. As duas rotas exigem o token de acesso do Supabase Auth no cabeçalho `Authorization: Bearer`.

### Drops

`GET /api/drops` retorna as datas e as peças restantes de cada drop anunciado. A página inicial usa esses dados para mostrar quando abre ou encerra a venda.

Defina o início, o encerramento opcional e o limite de peças na tabela `colecao`. Na migração, as datas antigas passaram a usar o fuso `America/Sao_Paulo`. O limite é compartilhado entre os produtos da coleção. Pedidos pendentes e confirmados ocupam esse limite.

## Execução local com o MySQL original

### Requisitos

- Node.js e npm
- MySQL Server
- MySQL Workbench, recomendado para executar os scripts SQL

### 1. Clonar o repositório

```bash
git clone https://github.com/Chario-Sousa/driplab.git
cd driplab
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Criar e popular o banco

No MySQL Workbench, execute os scripts nesta ordem, em um banco vazio:

1. `sql/criar_banco.sql`
2. `sql/inserir_dados.sql`

Execute o script de inserção apenas uma vez para evitar registros duplicados.

### 4. Configurar a conexão local

Crie um arquivo `.env` na raiz do projeto, no mesmo nível de `package.json`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=driplab_db
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
PORT=3000
```

Substitua `seu_usuario_mysql` e `sua_senha_mysql` pelos dados da sua instalação local do MySQL. O Express usa as variáveis `DB_*` para MySQL quando `DATABASE_URL` está ausente na execução local.

**Não envie o arquivo `.env` ao GitHub.** Ele contém credenciais; o `.gitignore` do projeto deve mantê-lo fora do repositório.

### 5. Iniciar o servidor

Com o MySQL em execução, inicie o servidor:

```bash
npm start
```

Acesse no navegador:

- Site local: [http://localhost:3000/](http://localhost:3000/)
- Verificar API e conexão com o banco: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Consultar produtos no MySQL: [http://localhost:3000/api/produtos](http://localhost:3000/api/produtos)

## Estrutura principal do projeto

- `public/` — arquivos do site usados pelo servidor local.
- `src/` — servidor Express e configuração de conexão com o banco.
- `sql/` — scripts de criação do banco e de inserção de dados.
- `docs/` — modelos do banco e arquivos estáticos publicados pelo GitHub Pages.
- `package.json` — dependências e comandos do projeto.

## Uso do site publicado

Acesse [https://chario-sousa.github.io/driplab/](https://chario-sousa.github.io/driplab/) para visualizar a demonstração estática. No catálogo, é possível adicionar produtos ao carrinho e testar os controles disponíveis na interface.

Para testar a consulta integrada ao Supabase, use a rota `/api/produtos` na execução local ou em um deploy da Vercel com `DATABASE_URL` configurada.
