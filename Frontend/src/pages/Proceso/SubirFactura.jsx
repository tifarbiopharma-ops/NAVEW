import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Camera, Image, Upload, X, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';

const API = import.meta.env.VITE_BACKEND_URL;

// Modal con el que el solicitante adjunta la factura de su traslado privado.
// Sube el archivo a MinIO (/api/imagenes) y luego cierra el traslado con esa ruta.
const SubirFactura = ({ traslado, token, onClose, onFinalizado }) => {
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cameraFileRef = useRef(null);
  const galleryFileRef = useRef(null);
  const uploadFileRef = useRef(null);

  const seleccionar = (event) => {
    setArchivo(event.target.files?.[0] || null);
    setError('');
  };

  const enviar = async (event) => {
    event.preventDefault();
    if (!archivo) {
      setError('Selecciona una foto o PDF de la factura');
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      const uploadResponse = await fetch(`${API}/api/imagenes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData?.msg || 'No se pudo subir la factura');

      const response = await fetch(`${API}/api/traslados/finalizar/${traslado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ evidencia_costo: uploadData.imagen?.objectName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudo finalizar el traslado');

      toast.success('Factura subida. El traslado quedó finalizado.');
      onFinalizado?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={enviar} className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-[#e5effd] p-2.5 text-[#315b86]"><Receipt size={20} /></div>
          <div>
            <h3 className="text-lg font-bold text-[#17243d]">Subir factura</h3>
            <p className="text-xs text-slate-500">{traslado.code}</p>
          </div>
        </div>

        <p className="text-sm text-slate-500">Adjunta la foto o el PDF de la factura de tu traslado privado.</p>

        <input ref={cameraFileRef} type="file" accept="image/*" capture="environment" onChange={seleccionar} className="hidden" />
        <input ref={galleryFileRef} type="file" accept="image/*" onChange={seleccionar} className="hidden" />
        <input ref={uploadFileRef} type="file" accept="image/*,application/pdf" onChange={seleccionar} className="hidden" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <button type="button" onClick={() => cameraFileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs font-semibold text-[#315b86] hover:bg-slate-50">
            <Camera size={22} /> Cámara
          </button>
          <button type="button" onClick={() => galleryFileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs font-semibold text-[#315b86] hover:bg-slate-50">
            <Image size={22} /> Galería
          </button>
          <button type="button" onClick={() => uploadFileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs font-semibold text-[#315b86] hover:bg-slate-50">
            <Upload size={22} /> Archivos
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {archivo ? `Archivo seleccionado: ${archivo.name}` : 'JPG, PNG, WEBP, GIF o PDF, hasta 10 MB.'}
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-5 w-full rounded-lg bg-[#17243d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d] disabled:opacity-60"
        >
          {enviando ? 'Subiendo...' : 'Subir factura y finalizar'}
        </button>
      </form>
    </div>
  );
};

SubirFactura.propTypes = {
  traslado: PropTypes.shape({
    id: PropTypes.string.isRequired,
    code: PropTypes.string,
  }).isRequired,
  token: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onFinalizado: PropTypes.func,
};

export default SubirFactura;
