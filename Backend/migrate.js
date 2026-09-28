import pool from './src/database.js';
import crypto from 'crypto';

async function migrate() {
  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios');
    console.log(`Found ${usuarios.length} users in 'usuarios' table.`);

    for (const u of usuarios) {
      const emailLower = u.email ? u.email.toLowerCase() : `test${u.id}@farbiopharma.com`;
      const hashData = `${u.cedula}-${emailLower}-${Date.now()}`;
      const hash_identificador = crypto.createHash('sha256').update(hashData).digest('hex');

      try {
        await pool.query(
          `INSERT INTO Colaboradores 
          (HASH_IDENTIFICADOR, CEDULA, NOMBRE, EMAIL_CORPORATIVO, PASSWORD, ROL, ESTADO) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [hash_identificador, u.cedula || `000000000${u.id}`, u.nombre, emailLower, u.password, u.rol || 'solicitante', u.estado === 'inactivo' ? 'BLOQUEADO' : 'ACTIVO']
        );
        console.log(`Migrated user: ${u.nombre}`);
      } catch (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          console.log(`User ${u.nombre} already exists in Colaboradores.`);
        } else {
          console.error(`Failed to insert ${u.nombre}:`, insertErr);
        }
      }
    }
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('Tabla usuarios no existe, probablemente ya fue eliminada o nunca existió.');
    } else {
      console.error('Migration error:', error);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
