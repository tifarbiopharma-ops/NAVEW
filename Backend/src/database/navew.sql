USE `farbiopharma_logistica`;

SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- DROP DE TABLAS EN ORDEN INVERSO DE DEPENDENCIAS
-- =========================================================

DROP TABLE IF EXISTS `Eventos_Process_Mining`;
DROP TABLE IF EXISTS `Aprobaciones`;
DROP TABLE IF EXISTS `Accesos_Externos_Acompanantes`;
DROP TABLE IF EXISTS `Accesos_Externos`;
DROP TABLE IF EXISTS `Envios_Paqueteria`;
DROP TABLE IF EXISTS `Traslados_Personal`;
DROP TABLE IF EXISTS `Celulares`;
DROP TABLE IF EXISTS `Extensiones`;
DROP TABLE IF EXISTS `Externos`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `Colaboradores`;
DROP TABLE IF EXISTS `Cargos`;
DROP TABLE IF EXISTS `Departamentos`;
DROP TABLE IF EXISTS `Areas`;
DROP TABLE IF EXISTS `Ubicaciones`;
DROP TABLE IF EXISTS `Plantas`;
DROP TABLE IF EXISTS `Empresas`;


-- =========================================================
-- 1. EMPRESAS
-- =========================================================

CREATE TABLE `Empresas` (
    `ID_EMPRESA` INT NOT NULL AUTO_INCREMENT,
    `NOMBRE` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_EMPRESA`),
    UNIQUE KEY `uk_empresas_nombre` (`NOMBRE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 2. AREAS
-- =========================================================

CREATE TABLE `Areas` (
    `ID_AREAS` INT NOT NULL AUTO_INCREMENT,
    `AREA` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_AREAS`),
    UNIQUE KEY `uk_areas_nombre` (`AREA`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 3. DEPARTAMENTOS
-- =========================================================

CREATE TABLE `Departamentos` (
    `ID_DEPARTAMENTOS` INT NOT NULL AUTO_INCREMENT,
    `DEPARTAMENTO` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_DEPARTAMENTOS`),
    UNIQUE KEY `uk_departamentos_nombre` (`DEPARTAMENTO`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 4. UBICACIONES
-- =========================================================

CREATE TABLE `Ubicaciones` (
    `ID_UBICACIONES` INT NOT NULL AUTO_INCREMENT,
    `DESCRIPCION` VARCHAR(150) NOT NULL,
    `GEOLOCALIZACION` VARCHAR(100) NOT NULL,
    `DIRECCION` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_UBICACIONES`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 5. PLANTAS
-- =========================================================

CREATE TABLE `Plantas` (
    `ID_Planta` VARCHAR(10) NOT NULL,
    `Nombre_Planta` VARCHAR(100) NOT NULL,
    `Ubicacion_Fisica` VARCHAR(255) NULL,

    PRIMARY KEY (`ID_Planta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 6. CARGOS
-- =========================================================

CREATE TABLE `Cargos` (
    `ID_CARGOS` INT NOT NULL AUTO_INCREMENT,
    `DESCRIPCION` VARCHAR(150) NOT NULL,
    `AREA` INT DEFAULT NULL,
    `DEPARTAMENTO` INT DEFAULT NULL,
    `ID_CARGO_SUPERIOR` INT DEFAULT NULL,

    PRIMARY KEY (`ID_CARGOS`),

    KEY `idx_cargos_area` (`AREA`),
    KEY `idx_cargos_departamento` (`DEPARTAMENTO`),
    KEY `idx_cargos_superior` (`ID_CARGO_SUPERIOR`),

    CONSTRAINT `fk_cargos_area`
        FOREIGN KEY (`AREA`)
        REFERENCES `Areas` (`ID_AREAS`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_cargos_departamento`
        FOREIGN KEY (`DEPARTAMENTO`)
        REFERENCES `Departamentos` (`ID_DEPARTAMENTOS`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_cargos_superior`
        FOREIGN KEY (`ID_CARGO_SUPERIOR`)
        REFERENCES `Cargos` (`ID_CARGOS`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 7. COLABORADORES
-- =========================================================

CREATE TABLE `Colaboradores` (
    `ID_COLABORADOR` INT NOT NULL AUTO_INCREMENT,
    `CEDULA` VARCHAR(10) NOT NULL,
    `NOMBRE` VARCHAR(100) NOT NULL,
    `EMAIL_CORPORATIVO` VARCHAR(100) NULL,

    `EMPRESA` INT DEFAULT NULL,
    `DEPARTAMENTO` INT DEFAULT NULL,
    `AREA` INT DEFAULT NULL,
    `CARGO` INT DEFAULT NULL,
    `UBICACION` INT DEFAULT NULL,

    `ESTADO` VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' COMMENT 'ACTIVO o INACTIVO',

    `FECHA_INGRESO` DATE DEFAULT NULL,
    `FECHA_SALIDA` DATE DEFAULT NULL,

    `CREATED_AT` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `UPDATED_AT` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`ID_COLABORADOR`),

    UNIQUE KEY `uk_colaboradores_cedula` (`CEDULA`),
    UNIQUE KEY `uk_colaboradores_email` (`EMAIL_CORPORATIVO`),

    KEY `idx_colaboradores_nombre` (`NOMBRE`),
    KEY `idx_colaboradores_empresa` (`EMPRESA`),
    KEY `idx_colaboradores_departamento` (`DEPARTAMENTO`),
    KEY `idx_colaboradores_area` (`AREA`),
    KEY `idx_colaboradores_cargo` (`CARGO`),
    KEY `idx_colaboradores_ubicacion` (`UBICACION`),
    KEY `idx_colaboradores_estado` (`ESTADO`),

    CONSTRAINT `fk_colaboradores_empresa`
        FOREIGN KEY (`EMPRESA`)
        REFERENCES `Empresas` (`ID_EMPRESA`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_colaboradores_departamento`
        FOREIGN KEY (`DEPARTAMENTO`)
        REFERENCES `Departamentos` (`ID_DEPARTAMENTOS`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_colaboradores_area`
        FOREIGN KEY (`AREA`)
        REFERENCES `Areas` (`ID_AREAS`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_colaboradores_cargo`
        FOREIGN KEY (`CARGO`)
        REFERENCES `Cargos` (`ID_CARGOS`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_colaboradores_ubicacion`
        FOREIGN KEY (`UBICACION`)
        REFERENCES `Ubicaciones` (`ID_UBICACIONES`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `chk_colaboradores_estado`
        CHECK (`ESTADO` IN ('ACTIVO', 'INACTIVO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 8. USUARIOS
-- =========================================================

CREATE TABLE `usuarios` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `cedula` VARCHAR(10) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `rol` VARCHAR(50) NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'activo' COMMENT 'activo o bloqueado',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),

    UNIQUE KEY `uk_usuarios_cedula` (`cedula`),
    UNIQUE KEY `uk_usuarios_email` (`email`),

    KEY `idx_usuarios_rol` (`rol`),
    KEY `idx_usuarios_estado` (`estado`),

    CONSTRAINT `fk_usuarios_colaborador`
        FOREIGN KEY (`cedula`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `chk_usuarios_estado`
        CHECK (`estado` IN ('activo', 'bloqueado'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 9. EXTENSIONES
-- =========================================================

CREATE TABLE `Extensiones` (
    `ID_EXTENSIONES` INT NOT NULL AUTO_INCREMENT,
    `ID_COLABORADOR` INT NOT NULL,
    `EXTENSION` INT NOT NULL,

    PRIMARY KEY (`ID_EXTENSIONES`),

    KEY `idx_extensiones_colaborador` (`ID_COLABORADOR`),
    UNIQUE KEY `uk_extension` (`EXTENSION`),

    CONSTRAINT `fk_extensiones_colaborador`
        FOREIGN KEY (`ID_COLABORADOR`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 10. CELULARES
-- =========================================================

CREATE TABLE `Celulares` (
    `ID_CELULARES` INT NOT NULL AUTO_INCREMENT,
    `ID_COLABORADOR` INT NOT NULL,
    `CELULAR` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`ID_CELULARES`),

    KEY `idx_celulares_colaborador` (`ID_COLABORADOR`),

    CONSTRAINT `fk_celulares_colaborador`
        FOREIGN KEY (`ID_COLABORADOR`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 11. EXTERNOS
-- =========================================================

CREATE TABLE `Externos` (
    `ID_Externo` VARCHAR(64) NOT NULL,
    `Es_Acompanante` TINYINT(1) NOT NULL DEFAULT 0,
    `Nombre_Apellido` VARCHAR(150) NOT NULL,
    `Cedula` VARCHAR(20) NOT NULL,
    `Telefono` VARCHAR(20) NOT NULL,
    `Empresa` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_Externo`),
    UNIQUE KEY `uk_externos_cedula` (`Cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 12. TRASLADOS DE PERSONAL
-- =========================================================

CREATE TABLE `Traslados_Personal` (
    `ID_Traslado` VARCHAR(36) NOT NULL,
    `Tipo_Traslado` VARCHAR(20) NOT NULL,

    `Fecha_Salida` DATE NOT NULL,
    `Hora_Salida` TIME NOT NULL,
    `Hora_Llegada` TIME NULL,

    `Motivo_Viaje` TEXT NULL,
    `Observaciones` TEXT NULL,

    `Km_Inicial` DECIMAL(10,2) NULL,
    `Km_Final` DECIMAL(10,2) NULL,

    `Monto_Solicitado` DECIMAL(12,2) NULL,
    `Evidencia_Costo` VARCHAR(255) NULL,

    `Estado_Actual` VARCHAR(30) NOT NULL,

    `QR_Token` TEXT NULL,
    `QR_Salida` DATETIME NULL,
    `QR_Entrada` DATETIME NULL,

    `ID_Solicitante` INT NOT NULL,
    `ID_Chofer` INT NULL,

    `ID_Planta_Origen` VARCHAR(10) NOT NULL,
    `ID_Planta_Destino` VARCHAR(10) NOT NULL,

    `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Fecha_Actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`ID_Traslado`),

    KEY `idx_traslados_solicitante` (`ID_Solicitante`),
    KEY `idx_traslados_chofer` (`ID_Chofer`),
    KEY `idx_traslados_planta_origen` (`ID_Planta_Origen`),
    KEY `idx_traslados_planta_destino` (`ID_Planta_Destino`),
    KEY `idx_traslados_estado` (`Estado_Actual`),

    CONSTRAINT `fk_traslados_solicitante`
        FOREIGN KEY (`ID_Solicitante`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_traslados_chofer`
        FOREIGN KEY (`ID_Chofer`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_traslados_planta_origen`
        FOREIGN KEY (`ID_Planta_Origen`)
        REFERENCES `Plantas` (`ID_Planta`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_traslados_planta_destino`
        FOREIGN KEY (`ID_Planta_Destino`)
        REFERENCES `Plantas` (`ID_Planta`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 13. ENVÍOS DE PAQUETERÍA
-- =========================================================

CREATE TABLE `Envios_Paqueteria` (
    `ID_Paquete` VARCHAR(36) NOT NULL,

    `Fecha_Salida` DATE NOT NULL,
    `Hora_Entrega` TIME NULL,

    `Tipo_Contenido` VARCHAR(100) NOT NULL,
    `Comentario` TEXT NULL,

    `ID_Planta_Origen` VARCHAR(10) NOT NULL,
    `ID_Area_Origen` INT NOT NULL,
    `ID_Responsable` INT NOT NULL,

    `ID_Planta_Destino` VARCHAR(10) NOT NULL,
    `ID_Area_Destino` INT NOT NULL,
    `ID_Destinatario` INT NOT NULL,

    `Estado_Actual` VARCHAR(30) NOT NULL,

    `QR_Token` TEXT NULL,
    `QR_Salida` TEXT NULL,
    `QR_Entrada` DATETIME NULL,

    `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Fecha_Actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`ID_Paquete`),

    KEY `idx_envios_responsable` (`ID_Responsable`),
    KEY `idx_envios_destinatario` (`ID_Destinatario`),
    KEY `idx_envios_planta_origen` (`ID_Planta_Origen`),
    KEY `idx_envios_planta_destino` (`ID_Planta_Destino`),
    KEY `idx_envios_area_origen` (`ID_Area_Origen`),
    KEY `idx_envios_area_destino` (`ID_Area_Destino`),
    KEY `idx_envios_estado` (`Estado_Actual`),

    CONSTRAINT `fk_envios_responsable`
        FOREIGN KEY (`ID_Responsable`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_destinatario`
        FOREIGN KEY (`ID_Destinatario`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_planta_origen`
        FOREIGN KEY (`ID_Planta_Origen`)
        REFERENCES `Plantas` (`ID_Planta`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_planta_destino`
        FOREIGN KEY (`ID_Planta_Destino`)
        REFERENCES `Plantas` (`ID_Planta`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_area_origen`
        FOREIGN KEY (`ID_Area_Origen`)
        REFERENCES `Areas` (`ID_AREAS`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_area_destino`
        FOREIGN KEY (`ID_Area_Destino`)
        REFERENCES `Areas` (`ID_AREAS`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 14. ACCESOS EXTERNOS
-- =========================================================

CREATE TABLE `Accesos_Externos` (
    `ID_Acceso` VARCHAR(36) NOT NULL,
    `ID_Externo` VARCHAR(64) NOT NULL,
    `ID_Empleado_Visitado` INT NOT NULL,
    `Numero_Acompanantes` INT NOT NULL DEFAULT 0,

    `Area_Visita` VARCHAR(100) NOT NULL,
    `ID_Planta_Destino` VARCHAR(10) NOT NULL,

    `Fecha_Visita` DATE NOT NULL,
    `Hora_Ingreso` TIME NULL,
    `Hora_Salida` TIME NULL,

    `Motivo` TEXT NULL,
    `Estado_Actual` VARCHAR(30) NOT NULL,

    `QR_Token` TEXT NULL,
    `QR_Salida` TEXT NULL,
    `QR_Llegada` TEXT NULL,

    `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Fecha_Actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`ID_Acceso`),

    KEY `idx_accesos_externo` (`ID_Externo`),
    KEY `idx_accesos_empleado_visitado` (`ID_Empleado_Visitado`),
    KEY `idx_accesos_planta_destino` (`ID_Planta_Destino`),
    KEY `idx_accesos_estado` (`Estado_Actual`),

    CONSTRAINT `fk_accesos_externo`
        FOREIGN KEY (`ID_Externo`)
        REFERENCES `Externos` (`ID_Externo`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_accesos_empleado_visitado`
        FOREIGN KEY (`ID_Empleado_Visitado`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_accesos_planta_destino`
        FOREIGN KEY (`ID_Planta_Destino`)
        REFERENCES `Plantas` (`ID_Planta`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 15. ACOMPAÑANTES DE ACCESOS EXTERNOS
-- =========================================================

CREATE TABLE `Accesos_Externos_Acompanantes` (
    `ID_Acceso` VARCHAR(36) NOT NULL,
    `ID_Externo` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`ID_Acceso`, `ID_Externo`),

    CONSTRAINT `fk_acompanantes_acceso`
        FOREIGN KEY (`ID_Acceso`)
        REFERENCES `Accesos_Externos` (`ID_Acceso`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_acompanantes_externo`
        FOREIGN KEY (`ID_Externo`)
        REFERENCES `Externos` (`ID_Externo`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 16. APROBACIONES
-- =========================================================

CREATE TABLE `Aprobaciones` (
    `ID_APROBACION` INT NOT NULL AUTO_INCREMENT,
    `TIPO_SOLICITUD` VARCHAR(30) NOT NULL,
    `ID_SOLICITUD` VARCHAR(36) NOT NULL,
    `NIVEL_APROBACION` INT NOT NULL,
    `ID_APROBADOR` INT NOT NULL,

    `ESTADO` VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    `COMENTARIO` TEXT NULL,

    `FECHA_ASIGNACION` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `FECHA_RESPUESTA` DATETIME NULL,

    PRIMARY KEY (`ID_APROBACION`),

    KEY `idx_aprobaciones_solicitud` (`TIPO_SOLICITUD`, `ID_SOLICITUD`),
    KEY `idx_aprobaciones_aprobador` (`ID_APROBADOR`),
    KEY `idx_aprobaciones_estado` (`ESTADO`),

    CONSTRAINT `fk_aprobaciones_aprobador`
        FOREIGN KEY (`ID_APROBADOR`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `chk_aprobaciones_estado`
        CHECK (`ESTADO` IN ('PENDIENTE', 'APROBADO', 'RECHAZADO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 16. EVENTOS PROCESS MINING
-- =========================================================

CREATE TABLE `Eventos_Process_Mining` (
    `ID_Evento` INT NOT NULL AUTO_INCREMENT,
    `ID_Transaccion` VARCHAR(36) NOT NULL,
    `Tipo_Modulo` VARCHAR(30) NOT NULL,
    `Fase_Estado` VARCHAR(50) NOT NULL,

    `Timestamp_Evento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ID_Usuario_Actor` INT NULL,
    `Detalles_Extra` TEXT NULL,

    PRIMARY KEY (`ID_Evento`),

    KEY `idx_process_mining_transaccion` (`ID_Transaccion`),
    KEY `idx_process_mining_modulo_estado` (`Tipo_Modulo`, `Fase_Estado`),

    CONSTRAINT `fk_process_mining_actor`
        FOREIGN KEY (`ID_Usuario_Actor`)
        REFERENCES `Colaboradores` (`ID_COLABORADOR`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =========================================================
-- 17. VISTA DE USUARIOS
-- =========================================================

CREATE OR REPLACE VIEW `vista_usuarios` AS
SELECT
    u.`id`,
    u.`cedula`,
    c.`NOMBRE`,
    c.`EMAIL_CORPORATIVO`,
    u.`email` AS `email_usuario`,
    u.`rol`,
    u.`estado`,
    c.`ESTADO` AS `estado_colaborador`,
    c.`CARGO`,
    c.`AREA`,
    c.`DEPARTAMENTO`,
    c.`UBICACION`,
    u.`created_at`,
    u.`updated_at`
FROM `usuarios` u
INNER JOIN `Colaboradores` c
    ON u.`cedula` = c.`CEDULA`;


SET FOREIGN_KEY_CHECKS = 1;