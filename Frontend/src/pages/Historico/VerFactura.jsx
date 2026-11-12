import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { LoaderCircle, Receipt, X, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;

// Muestra la factura de un traslado. El backend valida el permiso y entrega
// un enlace temporal de MinIO, por eso se pide cada vez que se abre el modal.
const VerFactura = ({ traslado, token, onClose }) => {
  const [factura, setFactura] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/api/traslados/${traslado.id}/factura`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.msg || 'No se pudo cargar la factura');
        setFactura(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });

    return () => controller.abort();
  }, [traslado.id, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-principal/40 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-borde bg-superficie p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-texto-muted hover:bg-superficie-muted hover:text-texto-secundario"
          title="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-suave p-2.5 text-acento"><Receipt size={20} /></div>
          <div>
            <h3 className="text-lg font-bold text-principal">Factura del traslado</h3>
            <p className="text-xs text-texto-muted">{traslado.code} · {traslado.requester}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-borde-suave bg-fondo">
          {error && <p className="p-6 text-center text-sm font-semibold text-error">{error}</p>}

          {!error && !factura && (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-texto-muted">
              <LoaderCircle className="animate-spin" size={18} /> Cargando factura...
            </div>
          )}

          {factura && (factura.esPdf ? (
            <iframe src={factura.url} title={`Factura ${traslado.code}`} className="h-[65vh] w-full" />
          ) : (
            <img src={factura.url} alt={`Factura ${traslado.code}`} className="mx-auto max-h-[65vh] object-contain" />
          ))}
        </div>

        {factura && (
          <a
            href={factura.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-borde py-2 text-sm font-semibold text-acento transition hover:bg-fondo"
          >
            <ExternalLink size={15} /> Abrir en otra pestaña
          </a>
        )}
      </div>
    </div>
  );
};

VerFactura.propTypes = {
  traslado: PropTypes.shape({
    id: PropTypes.string.isRequired,
    code: PropTypes.string,
    requester: PropTypes.string,
  }).isRequired,
  token: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VerFactura;
