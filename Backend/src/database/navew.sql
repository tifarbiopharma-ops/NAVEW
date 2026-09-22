-- -----------------------------------------------------
-- Table `farbiopharma_logistica`.`Traslados_Personal`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `farbiopharma_logistica`.`Traslados_Personal` (
  `ID_Traslado` VARCHAR(36) NOT NULL,

  -- Tipo de traslado
  -- Empresarial / Privado / Personal
  `Tipo_Traslado` VARCHAR(20) NOT NULL,

  -- Fecha y horario
  `Fecha_Salida` DATE NOT NULL,
  `Hora_Salida` TIME NOT NULL,
  `Hora_Llegada` TIME NULL,

  -- Información de la solicitud
  `Motivo_Viaje` TEXT NULL,

  -- Kilometraje
  -- Principalmente utilizado para traslado Personal
  `Km_Inicial` DECIMAL(10,2) NULL,
  `Km_Final` DECIMAL(10,2) NULL,

  -- Valores económicos
  `Monto_Pagado` DECIMAL(12,2) NULL,

  -- Referencia del archivo de factura
  -- Principalmente utilizado para traslado Privado
  `Factura_Referencia` VARCHAR(255) NULL,

  -- Seguimiento
  `Estado_Actual` VARCHAR(30) NOT NULL,
  `Progreso` INT NOT NULL DEFAULT 0,

  -- Información de QR
  `QR_Token` TEXT NULL,
  `QR_Salida` TEXT NULL,
  `QR_Llegada` TEXT NULL,

  -- Personas involucradas
  `ID_Solicitante` VARCHAR(64) NOT NULL,
  `ID_Chofer` VARCHAR(64) NULL,

  -- Plantas
  `ID_Planta_Origen` VARCHAR(10) NOT NULL,
  `ID_Planta_Destino` VARCHAR(10) NOT NULL,

  -- Auditoría
  `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Fecha_Actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`ID_Traslado`),

  INDEX `idx_traslados_solicitante`
    (`ID_Solicitante` ASC),

  INDEX `idx_traslados_chofer`
    (`ID_Chofer` ASC),

  INDEX `idx_traslados_planta_origen`
    (`ID_Planta_Origen` ASC),

  INDEX `idx_traslados_planta_destino`
    (`ID_Planta_Destino` ASC),

  INDEX `idx_traslados_estado`
    (`Estado_Actual` ASC),

  CONSTRAINT `fk_Traslados_Personal_Solicitante`
    FOREIGN KEY (`ID_Solicitante`)
    REFERENCES `farbiopharma_logistica`.`Empleados` (`ID_Empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  CONSTRAINT `fk_Traslados_Personal_Chofer`
    FOREIGN KEY (`ID_Chofer`)
    REFERENCES `farbiopharma_logistica`.`Empleados` (`ID_Empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  CONSTRAINT `fk_Traslados_Personal_Planta_Origen`
    FOREIGN KEY (`ID_Planta_Origen`)
    REFERENCES `farbiopharma_logistica`.`Plantas` (`ID_Planta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  CONSTRAINT `fk_Traslados_Personal_Planta_Destino`
    FOREIGN KEY (`ID_Planta_Destino`)
    REFERENCES `farbiopharma_logistica`.`Plantas` (`ID_Planta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION

) ENGINE = InnoDB;



-- -----------------------------------------------------
-- Table `farbiopharma_logistica`.`Envios_Paqueteria`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `farbiopharma_logistica`.`Envios_Paqueteria` (
  
  `ID_Paquete` VARCHAR(36) NOT NULL,

  -- Datos de la solicitud
  `Fecha_Salida` DATE NOT NULL,
  `Hora_Entrega` TIME NULL,

  `Tipo_Contenido` VARCHAR(100) NOT NULL,
  `Comentario` TEXT NULL,

  -- Origen
  `ID_Planta_Origen` VARCHAR(10) NOT NULL,
  `ID_Departamento_Origen` INT NOT NULL,

  -- Responsable de enviar el paquete
  `ID_Responsable` VARCHAR(64) NOT NULL,

  -- Destino
  `ID_Planta_Destino` VARCHAR(10) NOT NULL,
  `ID_Departamento_Destino` INT NOT NULL,

  -- Persona que recibe
  `ID_Destinatario` VARCHAR(64) NOT NULL,

  -- Seguimiento
  `Estado_Actual` VARCHAR(30) NOT NULL,
  `Progreso` INT NOT NULL DEFAULT 0,

  -- QR
  `QR_Token` TEXT NULL,
  `QR_Salida` TEXT NULL,
  `QR_Llegada` TEXT NULL,

  -- Auditoría
  `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Fecha_Actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`ID_Paquete`),

  -- Índices
  INDEX `idx_envios_responsable`
    (`ID_Responsable` ASC),

  INDEX `idx_envios_destinatario`
    (`ID_Destinatario` ASC),

  INDEX `idx_envios_planta_origen`
    (`ID_Planta_Origen` ASC),

  INDEX `idx_envios_planta_destino`
    (`ID_Planta_Destino` ASC),

  INDEX `idx_envios_departamento_origen`
    (`ID_Departamento_Origen` ASC),

  INDEX `idx_envios_departamento_destino`
    (`ID_Departamento_Destino` ASC),

  INDEX `idx_envios_estado`
    (`Estado_Actual` ASC),

  -- Responsable
  CONSTRAINT `fk_Envios_Paqueteria_Responsable`
    FOREIGN KEY (`ID_Responsable`)
    REFERENCES `farbiopharma_logistica`.`Empleados` (`ID_Empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  -- Destinatario
  CONSTRAINT `fk_Envios_Paqueteria_Destinatario`
    FOREIGN KEY (`ID_Destinatario`)
    REFERENCES `farbiopharma_logistica`.`Empleados` (`ID_Empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  -- Planta origen
  CONSTRAINT `fk_Envios_Paqueteria_Planta_Origen`
    FOREIGN KEY (`ID_Planta_Origen`)
    REFERENCES `farbiopharma_logistica`.`Plantas` (`ID_Planta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  -- Planta destino
  CONSTRAINT `fk_Envios_Paqueteria_Planta_Destino`
    FOREIGN KEY (`ID_Planta_Destino`)
    REFERENCES `farbiopharma_logistica`.`Plantas` (`ID_Planta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  -- Departamento origen
  CONSTRAINT `fk_Envios_Paqueteria_Departamento_Origen`
    FOREIGN KEY (`ID_Departamento_Origen`)
    REFERENCES `farbiopharma_logistica`.`Departamentos` (`ID_Departamento`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  -- Departamento destino
  CONSTRAINT `fk_Envios_Paqueteria_Departamento_Destino`
    FOREIGN KEY (`ID_Departamento_Destino`)
    REFERENCES `farbiopharma_logistica`.`Departamentos` (`ID_Departamento`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION

) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `farbiopharma_logistica`.`Accesos_Externos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `farbiopharma_logistica`.`Accesos_Externos` (
  
  `ID_Acceso` VARCHAR(36) NOT NULL,

  -- Persona externa
  `ID_Externo` VARCHAR(64) NOT NULL,

  -- Persona de la empresa a quien visita
  `ID_Empleado_Visitado` VARCHAR(64) NOT NULL,

  -- Lugar de la visita
  `Area_Visita` VARCHAR(100) NOT NULL,
  `ID_Planta_Destino` VARCHAR(10) NOT NULL,

  -- Datos de la visita
  `Fecha_Visita` DATE NOT NULL,
  `Hora_Ingreso` TIME NULL,
  `Hora_Salida` TIME NULL,

  -- Motivo
  `Motivo` TEXT NULL,

  -- Estado
  `Estado_Actual` VARCHAR(30) NOT NULL,

  -- QR
  `QR_Token` TEXT NULL,
  `QR_Salida` TEXT NULL,
  `QR_Llegada` TEXT NULL,

  -- Auditoría
  `Fecha_Creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Fecha_Actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`ID_Acceso`),

  INDEX `idx_accesos_externo`
    (`ID_Externo` ASC),

  INDEX `idx_accesos_empleado_visitado`
    (`ID_Empleado_Visitado` ASC),

  INDEX `idx_accesos_planta_destino`
    (`ID_Planta_Destino` ASC),

  INDEX `idx_accesos_estado`
    (`Estado_Actual` ASC),

  CONSTRAINT `fk_Accesos_Externos_Externo`
    FOREIGN KEY (`ID_Externo`)
    REFERENCES `farbiopharma_logistica`.`Externos` (`ID_Externo`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  CONSTRAINT `fk_Accesos_Externos_Empleado_Visitado`
    FOREIGN KEY (`ID_Empleado_Visitado`)
    REFERENCES `farbiopharma_logistica`.`Empleados` (`ID_Empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,

  CONSTRAINT `fk_Accesos_Externos_Planta_Destino`
    FOREIGN KEY (`ID_Planta_Destino`)
    REFERENCES `farbiopharma_logistica`.`Plantas` (`ID_Planta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION

) ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
