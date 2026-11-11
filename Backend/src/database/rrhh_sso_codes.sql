USE `farbiopharma_logistica`;

-- Aplicar una sola vez antes de habilitar el acceso SSO a Talento Humano.
-- Solo se almacena el hash del código; cada código vence en 60 segundos y se consume una vez.
CREATE TABLE IF NOT EXISTS `rrhh_sso_codes` (
    `code_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `user_id` INT NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `consumed_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`code_hash`),
    KEY `idx_rrhh_sso_user_expiry` (`user_id`, `expires_at`),
    KEY `idx_rrhh_sso_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
