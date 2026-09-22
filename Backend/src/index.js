import dotenv from 'dotenv';
import './database.js';

dotenv.config();

(async () => {
  const { app } = await import('./server.js');

  app.listen(app.get('port'), () => {
    console.log(`Servidor corriendo en http://localhost:${app.get('port')}`);
  });
})();