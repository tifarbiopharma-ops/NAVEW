import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Camera, Image, Upload, X, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';

const API = import.meta.env.VITE_BACKEND_URL;

// Modal con el que el solicitante adjunta la factura de su traslado privado.
// Un solo envío: el backend valida el traslado, guarda la factura en MinIO y lo finaliza.
const SubirFactura = ({ traslado, token, onClose, onFinalizado }) => {
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [camaraError, setCamaraError] = useState('');

  const galleryFileRef = useRef(null);
  const uploadFileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const seleccionar = (event) => {
    setArchivo(event.target.files?.[0] || null);
    setError('');
    event.target.value = '';
  };

  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamaraAbierta(false);
  };

  const abrirCamara = async () => {
    setCamaraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCamaraAbierta(true);
    } catch {
      setCamaraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  };

  useEffect(() => {
    if (camaraAbierta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camaraAbierta]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const tomarFoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCamaraError('La cámara todavía no está lista. Intenta nuevamente.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCamaraError('No se pudo capturar la foto.');
        return;
      }
      setArchivo(new File([blob], `factura-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      setError('');
      cerrarCamara();
    }, 'image/jpeg', 0.9);
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
      formData.append('factura', archivo);
      const response = await fetch(`${API}/api/traslados/${traslado.id}/factura`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudo subir la factura');

      toast.success(data.msg || 'Factura subida. El traslado quedó finalizado.');
      onFinalizado?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-principal/40 p-4 backdrop-blur-sm">
      <form onSubmit={enviar} className="relative w-full max-w-md rounded-2xl border border-borde bg-superficie p-6 shadow-xl">
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
            <h3 className="text-lg font-bold text-principal">Subir factura</h3>
            <p className="text-xs text-texto-muted">{traslado.code}</p>
          </div>
        </div>

        <p className="text-sm text-texto-muted">Adjunta una foto o PDF de la factura de tu traslado privado.</p>

        <input ref={galleryFileRef} type="file" accept="image/*" onChange={seleccionar} className="hidden" />
        <input ref={uploadFileRef} type="file" accept="application/pdf,.pdf" onChange={seleccionar} className="hidden" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <button type="button" onClick={abrirCamara} className="flex flex-col items-center gap-2 rounded-lg border border-borde p-3 text-xs font-semibold text-acento hover:bg-fondo">
            <Camera size={22} /> Cámara
          </button>
          <button type="button" onClick={() => galleryFileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg border border-borde p-3 text-xs font-semibold text-acento hover:bg-fondo">
            <Image size={22} /> Galería
          </button>
          <button type="button" onClick={() => uploadFileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg border border-borde p-3 text-xs font-semibold text-acento hover:bg-fondo">
            <Upload size={22} /> Archivos
          </button>
        </div>
        <p className="mt-3 text-xs text-texto-muted">
          {archivo ? `Archivo seleccionado: ${archivo.name}` : 'Cámara: foto. Galería: fotos. Archivos: PDF. Hasta 10 MB.'}
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-error">{error}</p>}
        {camaraError && <p className="mt-2 text-xs font-semibold text-error">{camaraError}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-5 w-full rounded-lg bg-principal py-2.5 text-sm font-semibold text-inverso transition hover:bg-principal-hover disabled:opacity-60"
        >
          {enviando ? 'Subiendo...' : 'Subir factura y finalizar'}
        </button>
      </form>
      {camaraAbierta && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-principal/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-superficie p-4 shadow-xl">
            <video ref={videoRef} autoPlay playsInline className="h-[55vh] w-full rounded-xl bg-principal object-cover" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={cerrarCamara} className="rounded-lg border border-borde px-4 py-2 text-sm font-semibold text-texto-secundario">
                Cancelar
              </button>
              <button type="button" onClick={tomarFoto} className="rounded-lg bg-principal px-4 py-2 text-sm font-semibold text-inverso">
                Tomar foto
              </button>
            </div>
          </div>
        </div>
      )}
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
