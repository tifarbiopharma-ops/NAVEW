import pool from './src/database.js';

async function migrate() {
  try {
    await pool.query('SELECT 1 FROM Colaboradores LIMIT 1');
    console.log('La tabla Colaboradores está disponible.');
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('La tabla Colaboradores no existe. Ejecuta primero el esquema principal de la base de datos.');
    } else {
      console.error('Migration error:', error);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
