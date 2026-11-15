CREATE DATABASE IF NOT EXISTS driplab_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE driplab_db;
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    pontos INT NOT NULL DEFAULT 0,
    xp INT NOT NULL DEFAULT 0,
    avatar VARCHAR(500) NULL,
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_email UNIQUE (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE colecao (
    id_colecao INT AUTO_INCREMENT PRIMARY KEY,
    nome_colecao VARCHAR(120) NOT NULL,
    data_lancamento DATETIME NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    data_encerramento DATETIME NULL,
    limite_pecas INT NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nome_categoria VARCHAR(80) NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conquista (
    id_conquista INT AUTO_INCREMENT PRIMARY KEY,
    nome_conquista VARCHAR(120) NOT NULL,
    descricao_conquista TEXT NOT NULL,
    icone VARCHAR(500) NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE votacao (
    id_votacao INT AUTO_INCREMENT PRIMARY KEY,
    nome_proposta_colecao VARCHAR(150) NOT NULL,
    descricao_votacao TEXT NOT NULL,
    data_limite DATETIME NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recompensa (
    id_recompensa INT AUTO_INCREMENT PRIMARY KEY,
    nome_recompensa VARCHAR(120) NOT NULL,
    descricao_recompensa TEXT NOT NULL,
    custo_pontos INT NOT NULL,
    quantidade_disponivel INT NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE produto (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome_produto VARCHAR(150) NOT NULL,
    descricao_produto TEXT NOT NULL,
    imagem_url VARCHAR(500) NULL,
    preco DECIMAL(10,2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    fk_categoria_id_categoria INT NOT NULL,
    fk_colecao_id_colecao INT NULL,

    CONSTRAINT fk_produto_categoria
        FOREIGN KEY (fk_categoria_id_categoria)
        REFERENCES categoria (id_categoria)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_produto_colecao
        FOREIGN KEY (fk_colecao_id_colecao)
        REFERENCES colecao (id_colecao)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedido (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    data_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    fk_usuario_id_usuario INT NOT NULL,

    CONSTRAINT fk_pedido_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comentario (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    texto TEXT NOT NULL,
    data_comentario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fk_usuario_id_usuario INT NOT NULL,
    fk_produto_id_produto INT NOT NULL,

    CONSTRAINT fk_comentario_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_comentario_produto
        FOREIGN KEY (fk_produto_id_produto)
        REFERENCES produto (id_produto)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE favorita (
    fk_usuario_id_usuario INT NOT NULL,
    fk_produto_id_produto INT NOT NULL,

    PRIMARY KEY (fk_usuario_id_usuario, fk_produto_id_produto),

    CONSTRAINT fk_favorita_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_favorita_produto
        FOREIGN KEY (fk_produto_id_produto)
        REFERENCES produto (id_produto)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ganha (
    fk_conquista_id_conquista INT NOT NULL,
    fk_usuario_id_usuario INT NOT NULL,
    data_desbloqueio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (fk_usuario_id_usuario, fk_conquista_id_conquista),

    CONSTRAINT fk_ganha_conquista
        FOREIGN KEY (fk_conquista_id_conquista)
        REFERENCES conquista (id_conquista)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_ganha_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contem (
    fk_pedido_id_pedido INT NOT NULL,
    fk_produto_id_produto INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (fk_pedido_id_pedido, fk_produto_id_produto),

    CONSTRAINT fk_contem_pedido
        FOREIGN KEY (fk_pedido_id_pedido)
        REFERENCES pedido (id_pedido)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_contem_produto
        FOREIGN KEY (fk_produto_id_produto)
        REFERENCES produto (id_produto)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE participa (
    fk_votacao_id_votacao INT NOT NULL,
    fk_usuario_id_usuario INT NOT NULL,
    data_voto DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (fk_votacao_id_votacao, fk_usuario_id_usuario),

    CONSTRAINT fk_participa_votacao
        FOREIGN KEY (fk_votacao_id_votacao)
        REFERENCES votacao (id_votacao)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_participa_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resgate (
    id_resgate INT AUTO_INCREMENT PRIMARY KEY,
    fk_recompensa_id_recompensa INT NOT NULL,
    fk_usuario_id_usuario INT NOT NULL,
    data_resgate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resgate_recompensa
        FOREIGN KEY (fk_recompensa_id_recompensa)
        REFERENCES recompensa (id_recompensa)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_resgate_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;