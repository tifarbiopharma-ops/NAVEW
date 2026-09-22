-- SQL para crear el primer usuario ADMINISTRADOR
-- Contraseña: Admin@123456789 (hasheada con bcryptjs)

INSERT INTO usuarios (id, nombre, cedula, email, password, rol, created_at, updated_at) 
VALUES (
    1,
    'Elkin Diaz',
    '1727660902',
    'pasante.ti@farbiopaharma.com',
    '$2b$10$f6EqKCKF4xSVHcXXmJDh2.yJY63xGUBvlscTbPB5KXL6Weox9q7Ue',
    'administrador',
    NOW(),
    NOW()
);

-- Verificar que se insertó
SELECT * FROM usuarios WHERE rol = 'administrador';
