import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { QrCode, CheckCircle2, XCircle, Camera, LoaderCircle } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';

const API = import.meta.env.VITE_BACKEND_URL;

const ValidarTransporteQR = () => {
  const token = storeAuth((state) => state.token);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Formulario Garita
  const [garitaForm, setGaritaForm] = useState({ km: '', observaciones: '' });
  
  // Detalle del traslado validado (Estado_Actual sacado de la trazabilidad)
  const [trasladoInfo, setTrasladoInfo] = useState(null);

  const resetScan = () => {
    setResult(null);
    setError('');
    setLoading(false);
    setTrasladoInfo(null);
    setGaritaForm({ km: '', observaciones: '' });
    isProcessingRef.current = false;
    startCamera();
  };

  const stopCamera = () => {
    if (scannerRef.current?.stop) {
      scannerRef.current.stop().catch(() => {});
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    scannerRef.current = null;
  };

  const startCamera = async () => {
    setError('');
    setLoading(false);
    isProcessingRef.current = false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('El navegador no soporta acceso a la cámara.');
      }

      await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } });
      setCameraPermissionGranted(true);

      const codeReader = new BrowserQRCodeReader();
      scannerRef.current = codeReader;

      await codeReader.decodeFromConstraints(
        { audio: false, video: { facingMode: 'environment' } },
        videoRef.current,
        (res, err) => {
          if (res && !isProcessingRef.current) {
            handleScanSuccess(res.getText());
          }
        }
      );
    } catch (e) {
      setCameraPermissionGranted(false);
      setError('Error al acceder a la cámara. Revisa los permisos.');
    }
  };

  const handleScanSuccess = async (scannedText) => {
    isProcessingRef.current = true;
    stopCamera();
    setResult(scannedText);
    setLoading(true);

    try {
      const idTraslado = scannedText.trim();
      
      const response = await fetch(`${API}/api/traslados/progreso/${idTraslado}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (!response.ok || !data.success || !data.progreso || data.progreso.length === 0) {
        throw new Error('Código QR Inválido o Traslado no encontrado.');
      }

      // El estado actual es el último evento registrado en Process Mining
      const estadoActual = data.progreso[data.progreso.length - 1].Fase_Estado;
      setTrasladoInfo({ id: idTraslado, estado: estadoActual, eventos: data.progreso });
    } catch (err) {
      setError(err.message || 'Error validando QR');
    } finally {
      setLoading(false);
    }
  };

  const procesarGarita = async (tipoAccion) => {
    if (!token || !trasladoInfo) return;
    setLoading(true);
    try {
      const isSalida = tipoAccion === 'salida';
      const endpoint = isSalida ? `/api/traslados/garita/salida/${trasladoInfo.id}` : `/api/traslados/garita/llegada/${trasladoInfo.id}`;
      
      const body = { observaciones: garitaForm.observaciones };
      if (isSalida) body.km_inicial = garitaForm.km;
      else body.km_final = garitaForm.km;

      const response = await fetch(`${API}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.msg || 'Error al registrar en garita');
      
      toast.success(data.msg);
      resetScan();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={4000} />
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Validar Código QR (Garita)</h1>
          <p className="mt-2 text-sm text-slate-500">Escanea el QR del empleado para registrar su salida o llegada.</p>
        </div>

        {!result && !error && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm text-center">
            {!cameraPermissionGranted ? (
              <button onClick={startCamera} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#17243D] p-4 text-white hover:bg-[#223a5d]">
                <Camera /> Iniciar Cámara
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-black aspect-square">
                  <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-48 w-48 rounded-2xl border-4 border-emerald-500/50"></div>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Apunta la cámara al QR</p>
                <button onClick={stopCamera} className="w-full rounded-xl border p-3">Detener</button>
              </div>
            )}
          </div>
        )}

        {loading && !error && !trasladoInfo && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm flex flex-col items-center">
            <LoaderCircle className="animate-spin text-blue-500" size={48} />
            <p className="mt-4 text-slate-500">Validando QR...</p>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <XCircle className="mx-auto mb-3 h-12 w-12 text-red-500" />
            <h3 className="mb-1 font-semibold text-red-900">Error</h3>
            <p className="mb-5 text-sm text-red-700">{error}</p>
            <button onClick={resetScan} className="w-full rounded-xl bg-red-100 py-2.5 font-medium text-red-700 hover:bg-red-200">
              Escanear de nuevo
            </button>
          </div>
        )}

        {trasladoInfo && (
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="text-center mb-6">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
              <h3 className="font-semibold text-emerald-900">QR Validado</h3>
              <p className="text-sm text-slate-500">ID: {trasladoInfo.id}</p>
              <p className="font-bold text-lg text-[#17243D] uppercase mt-2">ESTADO ACTUAL: {trasladoInfo.estado}</p>
            </div>

            <div className="space-y-4">
              <input 
                type="number" 
                step="0.1" 
                placeholder="Kilometraje (Opcional si es Privado)" 
                value={garitaForm.km} 
                onChange={(e) => setGaritaForm({...garitaForm, km: e.target.value})} 
                className="w-full rounded-xl border border-slate-200 p-3" 
              />
              <textarea 
                placeholder="Observaciones de seguridad" 
                value={garitaForm.observaciones} 
                onChange={(e) => setGaritaForm({...garitaForm, observaciones: e.target.value})} 
                className="w-full rounded-xl border border-slate-200 p-3" 
                rows="2"
              ></textarea>

              <div className="flex gap-2 pt-4">
                <button 
                  disabled={trasladoInfo.estado !== 'APROBADO_JEFE'} 
                  onClick={() => procesarGarita('salida')} 
                  className={`w-1/2 rounded-xl py-3 font-semibold text-white ${trasladoInfo.estado === 'APROBADO_JEFE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300'}`}
                >
                  Confirmar Salida
                </button>
                <button 
                  disabled={trasladoInfo.estado !== 'ESCANEADO_ORIGEN'} 
                  onClick={() => procesarGarita('llegada')} 
                  className={`w-1/2 rounded-xl py-3 font-semibold text-white ${trasladoInfo.estado === 'ESCANEADO_ORIGEN' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}
                >
                  Confirmar Llegada
                </button>
              </div>

              <button onClick={resetScan} className="mt-4 w-full rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200">
                Cancelar / Escanear de nuevo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidarTransporteQR;
