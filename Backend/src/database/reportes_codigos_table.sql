-- Tabla de auditoria para reportes de cambios en codigos
CREATE TABLE reportes_codigos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_id INT NOT NULL,
  codigo VARCHAR(35) NULL,
  modulo ENUM('creacion', 'compras', 'contabilidad', 'maestrodatos', 'sap') NOT NULL,
  accion VARCHAR(150) NOT NULL,
  campo_afectado VARCHAR(200) NULL,
  valor_anterior JSON NULL,
  valor_nuevo JSON NULL,
  usuario_id INT NULL,
  usuario_nombre VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (codigo_id) REFERENCES codigos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,

  INDEX idx_codigo_id (codigo_id),
  INDEX idx_modulo (modulo),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
