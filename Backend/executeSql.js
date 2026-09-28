import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL. Reading navew.sql...');
    const sqlPath = path.join(__dirname, 'src', 'database', 'navew.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing script...');
    await connection.query(sqlScript);
    console.log('Schema created successfully.');
  } catch (err) {
    console.error('Error executing script:', err);
  } finally {
    await connection.end();
  }
}

run();
