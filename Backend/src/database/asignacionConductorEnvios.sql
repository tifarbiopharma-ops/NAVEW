-- Ejecutar una sola vez. Conserva todos los envíos y permite asignación posterior.
ALTER TABLE Envios_Paqueteria
  ADD COLUMN ID_Conductor INT NULL,
  ADD INDEX idx_envios_conductor (ID_Conductor),
  ADD CONSTRAINT fk_envios_conductor FOREIGN KEY (ID_Conductor)
    REFERENCES Colaboradores (ID_COLABORADOR) ON DELETE RESTRICT ON UPDATE CASCADE;
