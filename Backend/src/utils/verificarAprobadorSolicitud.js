import pool from '../database.js';
import { obtenerJefeDirecto } from './jerarquia.js';

// No se interpreta un error de configuración como ausencia de superior.
export const resolverAprobadorSolicitud = async (idColaborador) => {
  const id = Number(idColaborador);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Colaborador no válido');
  }

  const jefe = await obtenerJefeDirecto(id);
  if (jefe) return Number(jefe);

  const [rows] = await pool.query(`
    SELECT jer.SUPERIOR_JERARQUICO AS superior,
           LOWER(u.rol) AS rol
    FROM Colaboradores c
    INNER JOIN Cargos cargo ON cargo.ID_CARGOS = c.CARGO
    INNER JOIN Jerarquia jer
      ON jer.CARGO = c.CARGO
     AND jer.DEPARTAMENTO = cargo.DEPARTAMENTO
    INNER JOIN usuarios u ON u.cedula = c.CEDULA
    WHERE c.ID_COLABORADOR = ?
  `, [id]);

  // Autoaprobación únicamente si el organigrama marca expresamente
  // este cargo como raíz (SUPERIOR_JERARQUICO = NULL).
  const esRaiz = rows.length > 0 && rows.every(row => row.superior == null);
  const rolHabilitado = rows.some(row =>
    ['jefe', 'administrador', 'subgerentegeneral'].includes(row.rol)
  );
  if (esRaiz && rolHabilitado) return id;

  throw new Error('No se encontró un superior activo o falta configurar el organigrama. Solicita revisión al administrador.');
};
