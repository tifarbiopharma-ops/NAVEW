-- Tabla de auditoria para reportes de cambios en usuarios
CREATE TABLE reportes_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  usuario_nombre VARCHAR(120) NULL,
  modulo ENUM('usuarios', 'admin') NOT NULL DEFAULT 'usuarios',
  accion VARCHAR(150) NOT NULL,
  campo_afectado VARCHAR(200) NULL,
  valor_anterior JSON NULL,
  valor_nuevo JSON NULL,
  target_user_id INT NULL,
  target_user_name VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_accion (accion),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
