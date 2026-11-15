# DripLab

Plataforma web de streetwear digital-first, com catálogo de produtos, drops e recursos de interação com a comunidade.

## Links

- **Site publicado:** [https://chario-sousa.github.io/driplab/](https://chario-sousa.github.io/driplab/)
- **Repositório GitHub:** [https://github.com/Chario-Sousa/driplab](https://github.com/Chario-Sousa/driplab)

> **Sobre a demonstração publicada:** o GitHub Pages publica uma versão estática do site. O catálogo dessa versão usa dados demonstrativos, e o carrinho funciona no navegador. Essa demonstração não consulta o MySQL. Para executar localmente a integração da API com o banco, siga as instruções abaixo.

## Objetivo do sistema

A DripLab é uma plataforma de streetwear criada para apresentar produtos e coleções de uma marca digital-first. A proposta combina a experiência de catálogo de uma loja virtual com telas para comunidade e interação.

## Funcionalidades

- Página inicial com catálogo demonstrativo de cinco produtos.
- Adição de produtos ao carrinho.
- Alteração de quantidades e remoção de itens.
- Cálculo do subtotal, frete e total do carrinho.
- Telas de coleções, cadastro, login e perfil.
- API local para verificar a conexão com o banco e consultar produtos.

### Limitações atuais

- No site publicado, os produtos são estáticos e não vêm do banco de dados.
- A API local possui os endpoints `GET /api/health` e `GET /api/produtos`.
- O cadastro e o login são protótipos de interface; ainda não autenticam pela API.
- O carrinho não cria nem salva pedidos no banco de dados.
- Votação, comentários e gamificação estão representados na proposta e nas telas, mas não estão integrados à API.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- Sequelize
- MySQL e `mysql2`
- Git e GitHub
- GitHub Pages para publicação da demonstração estática

## Banco de dados e modelagem

O banco de dados chama-se `driplab_db` e contém 14 tabelas:

`usuario`, `colecao`, `categoria`, `conquista`, `votacao`, `recompensa`, `produto`, `pedido`, `comentario`, `favorita`, `ganha`, `contem`, `participa` e `resgate`.

### Scripts SQL

- [Criação do banco e das tabelas](sql/criar_banco.sql)
- [Inserção dos dados de teste](sql/inserir_dados.sql)

### Modelagem

- [Modelo conceitual — arquivo do brModelo](docs/dripconceito.xml)
- [Modelo lógico — arquivo do brModelo](docs/driplogico.xml)
- Diagrama Entidade-Relacionamento (DER):

![Diagrama Entidade-Relacionamento do banco DripLab](docs/der.png)

## Instalação e execução local

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

Substitua `seu_usuario_mysql` e `sua_senha_mysql` pelos dados da sua instalação local do MySQL.

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

Para testar a consulta de produtos integrada ao MySQL, execute a aplicação localmente seguindo as instruções deste documento.