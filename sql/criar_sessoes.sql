USE driplab_db;

CREATE TABLE IF NOT EXISTS sessao_usuario (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    id_usuario INT NOT NULL,
    expira_em DATETIME NOT NULL,
    INDEX idx_sessao_usuario_expira (id_usuario, expira_em),
    CONSTRAINT fk_sessao_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
) ENGINE=InnoDB;
