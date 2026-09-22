CREATE SCHEMA IF NOT EXISTS `farbiopharma_logistica`
DEFAULT CHARACTER SET utf8mb4;

USE `farbiopharma_logistica`;

SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. AREAS
-- =========================================================

DROP TABLE IF EXISTS `Aprobaciones`;
DROP TABLE IF EXISTS `Accesos_Externos`;
DROP TABLE IF EXISTS `Envios_Paqueteria`;
DROP TABLE IF EXISTS `Traslados_Personal`;
DROP TABLE IF EXISTS `Correos`;
DROP TABLE IF EXISTS `Celulares`;
DROP TABLE IF EXISTS `Extensiones`;
DROP TABLE IF EXISTS `Externos`;
DROP TABLE IF EXISTS `Colaboradores`;
DROP TABLE IF EXISTS `Cargos`;
DROP TABLE IF EXISTS `Departamentos`;
DROP TABLE IF EXISTS `Areas`;
DROP TABLE IF EXISTS `Ubicaciones`;
DROP TABLE IF EXISTS `Plantas`;


CREATE TABLE `Areas` (
    `ID_AREAS` INT NOT NULL AUTO_INCREMENT,
    `AREA` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_AREAS`),

    UNIQUE KEY `uk_areas_nombre` (`AREA`)
) ENGINE=InnoDB;


-- =========================================================
-- 2. DEPARTAMENTOS
-- =========================================================

CREATE TABLE `Departamentos` (
    `ID_DEPARTAMENTOS` INT NOT NULL AUTO_INCREMENT,
    `DEPARTAMENTO` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_DEPARTAMENTOS`),

    UNIQUE KEY `uk_departamentos_nombre` (`DEPARTAMENTO`)
) ENGINE=InnoDB;


-- =========================================================
-- 3. UBICACIONES
-- =========================================================

CREATE TABLE `Ubicaciones` (
    `ID_UBICACIONES` INT NOT NULL AUTO_INCREMENT,
    `DESCRIPCION` VARCHAR(150) NOT NULL,
    `GEOLOCALIZACION` VARCHAR(100) NOT NULL,
    `DIRECCION` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_UBICACIONES`)
) ENGINE=InnoDB;


-- =========================================================
-- 4. PLANTAS
-- =========================================================

CREATE TABLE `Plantas` (
    `ID_Planta` VARCHAR(10) NOT NULL,
    `Nombre_Planta` VARCHAR(100) NOT NULL,
    `Ubicacion_Fisica` VARCHAR(255) NULL,

    PRIMARY KEY (`ID_Planta`)
) ENGINE=InnoDB;


-- =========================================================
-- 5. CARGOS
--
-- El cargo es parte del ORGANIGRAMA.
--
-- ID_CARGO_SUPERIOR indica de qué cargo depende.
--
-- Ejemplo:
--
-- GERENTE GENERAL
--      |
--      +-- SUBGERENTE GENERAL VETERINARIA
--      |       |
--      |       +-- LIDER OPERARIO
--      |
--      +-- SUBGERENTE GENERAL SOPORTE DE NEGOCIO
--
-- NO se coloca todavía la jerarquía de los cargos,
-- porque esa información debe venir de la estructura real
-- de la empresa y no vamos a inventarla.
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
) ENGINE=InnoDB;


-- =========================================================
-- 6. COLABORADORES
--
-- Esta es la tabla PRINCIPAL de personas internas.
--
-- Ya NO utilizaremos una tabla "Empleados" separada.
--
-- CEDULA identifica al colaborador.
--
-- ESTADO:
-- ACTIVO
-- INACTIVO
--
-- FECHA_SALIDA permite conservar historial.
-- =========================================================

CREATE TABLE `Colaboradores` (
    `CEDULA` VARCHAR(10) NOT NULL,
    `NOMBRE` VARCHAR(100) NOT NULL,
    `EMPRESA` VARCHAR(100) DEFAULT NULL,

    `DEPARTAMENTO` INT DEFAULT NULL,
    `AREA` INT DEFAULT NULL,
    `CARGO` INT DEFAULT NULL,
    `UBICACION` INT DEFAULT NULL,

    `PASSWORD` VARCHAR(255) NOT NULL,
    `ROL` VARCHAR(50) NOT NULL,

    `ESTADO` VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',

    `FECHA_INGRESO` DATE DEFAULT NULL,
    `FECHA_SALIDA` DATE DEFAULT NULL,

    PRIMARY KEY (`CEDULA`),

    KEY `idx_colaboradores_nombre` (`NOMBRE`),
    KEY `idx_colaboradores_departamento` (`DEPARTAMENTO`),
    KEY `idx_colaboradores_area` (`AREA`),
    KEY `idx_colaboradores_cargo` (`CARGO`),
    KEY `idx_colaboradores_ubicacion` (`UBICACION`),
    KEY `idx_colaboradores_estado` (`ESTADO`),

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
) ENGINE=InnoDB;


-- =========================================================
-- 7. EXTENSIONES
-- =========================================================

CREATE TABLE `Extensiones` (
    `ID_EXTENSIONES` INT NOT NULL AUTO_INCREMENT,
    `ID_COLABORADOR` VARCHAR(10) NOT NULL,
    `EXTENSION` INT NOT NULL,

    PRIMARY KEY (`ID_EXTENSIONES`),

    KEY `idx_extensiones_colaborador` (`ID_COLABORADOR`),

    UNIQUE KEY `uk_extension` (`EXTENSION`),

    CONSTRAINT `fk_extensiones_colaborador`
        FOREIGN KEY (`ID_COLABORADOR`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 8. CELULARES
-- =========================================================

CREATE TABLE `Celulares` (
    `ID_CELULARES` INT NOT NULL AUTO_INCREMENT,
    `ID_COLABORADOR` VARCHAR(10) NOT NULL,
    `CELULAR` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`ID_CELULARES`),

    KEY `idx_celulares_colaborador` (`ID_COLABORADOR`),

    CONSTRAINT `fk_celulares_colaborador`
        FOREIGN KEY (`ID_COLABORADOR`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 9. CORREOS
-- =========================================================

CREATE TABLE `Correos` (
    `ID_CORREOS` INT NOT NULL AUTO_INCREMENT,
    `ID_COLABORADOR` VARCHAR(10) NOT NULL,
    `CORREO` VARCHAR(150) NOT NULL,

    PRIMARY KEY (`ID_CORREOS`),

    KEY `idx_correos_colaborador` (`ID_COLABORADOR`),

    CONSTRAINT `fk_correos_colaborador`
        FOREIGN KEY (`ID_COLABORADOR`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 10. EXTERNOS
-- =========================================================

CREATE TABLE `Externos` (
    `ID_Externo` VARCHAR(64) NOT NULL,
    `Nombre_Apellido` VARCHAR(150) NOT NULL,
    `Cedula` VARCHAR(20) NOT NULL,
    `Telefono` VARCHAR(20) NOT NULL,
    `Empresa` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`ID_Externo`),

    UNIQUE KEY `uk_externos_cedula` (`Cedula`)
) ENGINE=InnoDB;


-- =========================================================
-- 11. TRASLADOS DE PERSONAL
--
-- NO existe Progreso.
-- El seguimiento se realiza mediante Estado_Actual.
--
-- Los colaboradores ahora se relacionan mediante CEDULA.
-- =========================================================

CREATE TABLE `Traslados_Personal` (
    `ID_Traslado` VARCHAR(36) NOT NULL,

    `Tipo_Traslado` VARCHAR(20) NOT NULL,

    `Fecha_Salida` DATE NOT NULL,
    `Hora_Salida` TIME NOT NULL,
    `Hora_Llegada` TIME NULL,

    `Motivo_Viaje` TEXT NULL,

    `Km_Inicial` DECIMAL(10,2) NULL,
    `Km_Final` DECIMAL(10,2) NULL,

    `Monto_Pagado` DECIMAL(12,2) NULL,
    `Factura_Referencia` VARCHAR(255) NULL,

    `Estado_Actual` VARCHAR(30) NOT NULL,

    `QR_Token` TEXT NULL,
    `QR_Salida` TEXT NULL,
    `QR_Llegada` TEXT NULL,

    `ID_Solicitante` VARCHAR(10) NOT NULL,
    `ID_Chofer` VARCHAR(10) NULL,

    `ID_Planta_Origen` VARCHAR(10) NOT NULL,
    `ID_Planta_Destino` VARCHAR(10) NOT NULL,

    `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Fecha_Actualizacion` DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`ID_Traslado`),

    KEY `idx_traslados_solicitante` (`ID_Solicitante`),
    KEY `idx_traslados_chofer` (`ID_Chofer`),
    KEY `idx_traslados_planta_origen` (`ID_Planta_Origen`),
    KEY `idx_traslados_planta_destino` (`ID_Planta_Destino`),
    KEY `idx_traslados_estado` (`Estado_Actual`),

    CONSTRAINT `fk_traslados_solicitante`
        FOREIGN KEY (`ID_Solicitante`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_traslados_chofer`
        FOREIGN KEY (`ID_Chofer`)
        REFERENCES `Colaboradores` (`CEDULA`)
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
) ENGINE=InnoDB;


-- =========================================================
-- 12. ENVÍOS DE PAQUETERÍA
--
-- NO existe Progreso.
-- =========================================================

CREATE TABLE `Envios_Paqueteria` (
    `ID_Paquete` VARCHAR(36) NOT NULL,

    `Fecha_Salida` DATE NOT NULL,
    `Hora_Entrega` TIME NULL,

    `Tipo_Contenido` VARCHAR(100) NOT NULL,
    `Comentario` TEXT NULL,

    `ID_Planta_Origen` VARCHAR(10) NOT NULL,
    `ID_Departamento_Origen` INT NOT NULL,
    `ID_Responsable` VARCHAR(10) NOT NULL,

    `ID_Planta_Destino` VARCHAR(10) NOT NULL,
    `ID_Departamento_Destino` INT NOT NULL,
    `ID_Destinatario` VARCHAR(10) NOT NULL,

    `Estado_Actual` VARCHAR(30) NOT NULL,

    `QR_Token` TEXT NULL,
    `QR_Salida` TEXT NULL,
    `QR_Llegada` TEXT NULL,

    `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Fecha_Actualizacion` DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`ID_Paquete`),

    KEY `idx_envios_responsable` (`ID_Responsable`),
    KEY `idx_envios_destinatario` (`ID_Destinatario`),
    KEY `idx_envios_planta_origen` (`ID_Planta_Origen`),
    KEY `idx_envios_planta_destino` (`ID_Planta_Destino`),
    KEY `idx_envios_departamento_origen` (`ID_Departamento_Origen`),
    KEY `idx_envios_departamento_destino` (`ID_Departamento_Destino`),
    KEY `idx_envios_estado` (`Estado_Actual`),

    CONSTRAINT `fk_envios_responsable`
        FOREIGN KEY (`ID_Responsable`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_destinatario`
        FOREIGN KEY (`ID_Destinatario`)
        REFERENCES `Colaboradores` (`CEDULA`)
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

    CONSTRAINT `fk_envios_departamento_origen`
        FOREIGN KEY (`ID_Departamento_Origen`)
        REFERENCES `Departamentos` (`ID_DEPARTAMENTOS`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_envios_departamento_destino`
        FOREIGN KEY (`ID_Departamento_Destino`)
        REFERENCES `Departamentos` (`ID_DEPARTAMENTOS`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 13. ACCESOS EXTERNOS
--
-- NO existe Progreso.
-- =========================================================

CREATE TABLE `Accesos_Externos` (
    `ID_Acceso` VARCHAR(36) NOT NULL,

    `ID_Externo` VARCHAR(64) NOT NULL,

    `ID_Empleado_Visitado` VARCHAR(10) NOT NULL,

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
    `Fecha_Actualizacion` DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

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
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_accesos_planta_destino`
        FOREIGN KEY (`ID_Planta_Destino`)
        REFERENCES `Plantas` (`ID_Planta`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 14. APROBACIONES
--
-- Esta tabla permite registrar quién aprobó/rechazó
-- una solicitud.
--
-- El APROBADOR se determina desde el ORGANIGRAMA.
--
-- TIPO_SOLICITUD puede ser:
-- TRASLADO
-- EXTERNO
-- SALIDA
-- etc.
--
-- ID_SOLICITUD guarda el identificador de la solicitud.
-- =========================================================

CREATE TABLE `Aprobaciones` (
    `ID_APROBACION` INT NOT NULL AUTO_INCREMENT,

    `TIPO_SOLICITUD` VARCHAR(30) NOT NULL,
    `ID_SOLICITUD` VARCHAR(36) NOT NULL,

    `NIVEL_APROBACION` INT NOT NULL,

    `ID_APROBADOR` VARCHAR(10) NOT NULL,

    `ESTADO` VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    `COMENTARIO` TEXT NULL,

    `FECHA_ASIGNACION` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `FECHA_RESPUESTA` DATETIME NULL,

    PRIMARY KEY (`ID_APROBACION`),

    KEY `idx_aprobaciones_solicitud`
        (`TIPO_SOLICITUD`, `ID_SOLICITUD`),

    KEY `idx_aprobaciones_aprobador`
        (`ID_APROBADOR`),

    KEY `idx_aprobaciones_estado`
        (`ESTADO`),

    CONSTRAINT `fk_aprobaciones_aprobador`
        FOREIGN KEY (`ID_APROBADOR`)
        REFERENCES `Colaboradores` (`CEDULA`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `chk_aprobaciones_estado`
        CHECK (
            `ESTADO` IN (
                'PENDIENTE',
                'APROBADO',
                'RECHAZADO'
            )
        )
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;