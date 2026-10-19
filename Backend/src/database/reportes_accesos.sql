CREATE TABLE IF NOT EXISTS reportes_accesos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  usuario_nombre VARCHAR(150) NULL,
  id_acceso VARCHAR(36) NULL,
  accion VARCHAR(80) NOT NULL,
  estado_anterior VARCHAR(80) NULL,
  estado_nuevo VARCHAR(80) NULL,
  detalles JSON NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reportes_accesos_usuario (usuario_id),
  INDEX idx_reportes_accesos_acceso (id_acceso),
  INDEX idx_reportes_accesos_fecha (fecha_registro)
);
