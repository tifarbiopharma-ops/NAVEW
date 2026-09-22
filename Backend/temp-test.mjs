import pool from './src/database.js';

const main = async () => {
  try {
    const [tables] = await pool.query('SHOW TABLES LIKE "reportes_usuarios"');
    console.log('tables', JSON.stringify(tables));

    const [cols] = await pool.query('SHOW COLUMNS FROM reportes_usuarios');
    console.log('columns', JSON.stringify(cols));

    const [res] = await pool.query(
      'INSERT INTO reportes_usuarios (usuario_id, usuario_nombre, modulo, accion, campo_afectado, valor_anterior, valor_nuevo, target_user_id, target_user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 'test', 'usuarios', 'prueba', 'usuario', JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 }), 2, 'target']
    );
    console.log('inserted', res.insertId);
  } catch (error) {
    console.error('ERROR', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
};

main();
