import { createRoot } from 'react-dom/client'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { cerrarSesionNavew } from './utils/cerrarSesionNavew'


if (window.location.pathname.replace(/\/$/, '') === '/logout') {
  // Limpiar el acceso antes de cargar rutas o pintar componentes de NAVEW.
  cerrarSesionNavew();
} else {
  import('./App.jsx').then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(<App />);
  }).catch((error) => {
    console.error('No se pudo cargar NAVEW:', error);
    document.getElementById('root').textContent = 'No se pudo cargar NAVEW. Recarga la página para intentarlo nuevamente.';
  });
}
