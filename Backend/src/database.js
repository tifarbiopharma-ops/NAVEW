import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Verificar la conexión
pool.getConnection()
  .then((connection) => {
    console.log('Connected to the MySQL database successfully.');
    connection.release();
  })
  .catch((err) => {
    console.error('Error connecting to the database:', {
      message: err.message,
    });
    process.exit(1);
  });

export default pool;