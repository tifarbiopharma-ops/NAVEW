import dotenv from 'dotenv';

dotenv.config();

await import('./database.js');
const { app } = await import('./server.js');

app.listen(app.get('port'), () => {
  console.log(`Servidor corriendo en http://localhost:${app.get('port')}`);
});