CREATE TABLE IF NOT EXISTS reportes_envios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  usuario_nombre VARCHAR(150) NULL,
  id_paquete CHAR(36) NOT NULL,
  accion VARCHAR(80) NOT NULL,
  estado_anterior VARCHAR(60) NULL,
  estado_nuevo VARCHAR(60) NULL,
  detalles JSON NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_reportes_envios_paquete (id_paquete),
  INDEX idx_reportes_envios_usuario (usuario_id),
  INDEX idx_reportes_envios_fecha (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
