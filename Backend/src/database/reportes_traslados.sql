CREATE TABLE IF NOT EXISTS reportes_traslados (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  usuario_nombre VARCHAR(255) NULL,
  accion VARCHAR(64) NOT NULL,
  id_traslado VARCHAR(64) NOT NULL,
  estado_anterior VARCHAR(64) NULL,
  estado_nuevo VARCHAR(64) NULL,
  detalles JSON NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reporte_traslado (id_traslado, fecha_registro),
  INDEX idx_reporte_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
