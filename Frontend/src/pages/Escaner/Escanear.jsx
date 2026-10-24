import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/library';
import storeAuth from '../../context/storeAuth';
import Formato from './Formato';
import { ToastContainer } from 'react-toastify';

const API = import.meta.env.VITE_BACKEND_URL;
const TIEMPO_MINIMO_VALIDACION_MS = 5000;

const Escanear = ({ isOpen = true, onClose, onSuccess, tipo = 'paqueteria' }) => {
  const token = storeAuth((state) => state.token);
  const currentToken = token;
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [formatoSalida, setFormatoSalida] = useState(null);
  const [aprobado, setAprobado] = useState(false);
  const [resultadoTipo, setResultadoTipo] = useState(null);
  const [qrFinalizado, setQrFinalizado] = useState(false);
  const [finalizacion, setFinalizacion] = useState(null);
  const [kmFinal, setKmFinal] = useState('');
  const [guardandoFinalizacion, setGuardandoFinalizacion] = useState(false);
  const [errorKm, setErrorKm] = useState('');
  const [salidaRegistrada, setSalidaRegistrada] = useState(false);
  const [acompanantes, setAcompanantes] = useState(null);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // 1) Obtener cámaras disponibles
  useEffect(() => {
    if (!isOpen) {
    // Resetear datos al cerrar el modal
    setAcompanantes(null);
    return;
  }

    const loadDevices = async () => {
      try {
        // Pedir permiso primero para que los labels de los dispositivos aparezcan
        await navigator.mediaDevices.getUserMedia({ video: true });

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');

        setDevices(videoDevices);

        if (videoDevices.length > 0 && !selectedDeviceId) {
          // Preferir cámara trasera si existe
          const backCam = videoDevices.find((d) =>
            /back|rear|environment|trasera/i.test(d.label)
          );
          setSelectedDeviceId(backCam?.deviceId || videoDevices[0].deviceId);
        }
      } catch (error) {
        console.warn('No se pudieron listar las cámaras:', error);
        setMessage({
          type: 'error',
          text: 'No se pudo acceder a las cámaras. Verifica los permisos.',
        });
      }
    };

    loadDevices();

    // Escuchar cambios de dispositivos (conectar/desconectar cámara USB)
    const handleDeviceChange = () => loadDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [isOpen]);

  // 2) Iniciar / reiniciar el escáner cuando cambia la cámara seleccionada
  useEffect(() => {
    if (!isOpen || !selectedDeviceId) return;

    const codeReader = new BrowserQRCodeReader();
    codeReaderRef.current = codeReader;
    let isSubscribed = true;

    const startScanner = async () => {
      try {
        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result && isSubscribed) {
              handleProcessCode(result.getText());
            }
          }
        );
        if (isSubscribed) setScanning(true);
      } catch (error) {
        console.warn('No se pudo iniciar el escáner:', error);
        if (isSubscribed) {
          setScanning(false);
          setMessage({
            type: 'error',
            text: 'No se pudo iniciar la cámara seleccionada.',
          });
        }
      }
    };

    const timer = setTimeout(startScanner, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [isOpen, selectedDeviceId]);

  const handleProcessCode = async (code) => {
    if (!code || loading) return;
    const inicioValidacion = Date.now();
    let mensajeResultado = null;
    let datosResultado = null;
    setLoading(true);
    setMessage(null);
    setAprobado(false);
    setQrFinalizado(false);

    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        setScanning(false);
      }

      const endpoint = tipo === 'transporte' ? 'transporte' : tipo === 'externo' ? 'externo' : 'paqueteria';
      const response = await fetch(`${API}/api/escaner/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ token_qr: code }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Código QR inválido o no encontrado');

      datosResultado = data;
      mensajeResultado = { type: 'success', text: '¡Solicitud verificada correctamente!' };
      if (onSuccess) onSuccess(data);
    } catch (error) {
      mensajeResultado = { type: 'error', text: error.message };
      const qrYaUtilizado = /ya fue escaneado|ciclo de utilidad/i.test(error.message);
      if (qrYaUtilizado) setQrFinalizado(true);
      // Reanudar escaneo para intentar de nuevo
      if (selectedDeviceId && !qrYaUtilizado) {
        const codeReader = new BrowserQRCodeReader();
        codeReaderRef.current = codeReader;
        try {
          await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result) => {
              if (result) handleProcessCode(result.getText());
            }
          );
          setScanning(true);
        } catch {
          /* ignore */
        }
      }
    } finally {
      const tiempoRestante =
        TIEMPO_MINIMO_VALIDACION_MS - (Date.now() - inicioValidacion);
      if (tiempoRestante > 0) {
        await new Promise((resolve) => setTimeout(resolve, tiempoRestante));
      }
      if (mensajeResultado?.type === 'success' && tipo === 'transporte' && datosResultado?.escaneos === 2 && datosResultado.requiereKmFinal) {
        setFinalizacion(datosResultado);
      } else if (mensajeResultado?.type === 'success' && tipo === 'transporte' && datosResultado?.escaneos === 2 && datosResultado.requiereFactura) {
        // La factura del traslado privado la sube el solicitante desde Proceso, no garita.
        setResultadoTipo('pendiente-factura');
        setAprobado(true);
      } else if (mensajeResultado?.type === 'success' && (tipo === 'transporte' || tipo === 'externo') && datosResultado?.escaneos === 1) {
        if(tipo === 'externo') {
          setAcompanantes(datosResultado.numeroAcompanantes ?? 0);
        }
        setSalidaRegistrada(true);
        setMessage(null);
      } else if (mensajeResultado?.type === 'success' && tipo === 'paqueteria' && datosResultado?.escaneos === 1) {
        setFormatoSalida({ token: code, data: datosResultado });
      } else if (mensajeResultado?.type === 'success' && datosResultado?.escaneos === 2) {
        setResultadoTipo(tipo);
        setAprobado(true);
      } else if (qrFinalizado) {
        setMessage(null);
      } else {
        setMessage(mensajeResultado);
      }
      setLoading(false);
    }
  };

  const guardarFinalizacion = async (event) => {
    event.preventDefault();
    if (!finalizacion?.traslado?.ID_Traslado) return;
    const finalizationToken = storeAuth.getState().token;
    if (!finalizationToken) {
      setMessage({ type: 'error', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
      return;
    }
    setGuardandoFinalizacion(true);
    try {
      const kmInicial = Number(finalizacion.traslado.Km_Inicial);
      const kmIngresado = Number(kmFinal);
      if (!Number.isFinite(kmIngresado) || kmIngresado <= kmInicial) {
        setErrorKm(`El KM final debe ser mayor que el KM inicial (${kmInicial}).`);
        return;
      }
      setErrorKm('');
      const response = await fetch(`${API}/api/traslados/finalizar/${finalizacion.traslado.ID_Traslado}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ km_final: kmIngresado }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudo finalizar el traslado');
      setFinalizacion(null);
      setResultadoTipo('transporte');
      setAprobado(true);
      onSuccess?.(data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setGuardandoFinalizacion(false);
    }
  };

  if (salidaRegistrada) {
  const esExterno = tipo === 'externo';
  return (
    <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-xl bg-white px-6 text-center">
      <div className="flex h-36 w-36 items-center justify-center rounded-full border-[7px] border-emerald-500 text-emerald-500">
        <CheckCircle2 size={112} strokeWidth={2.2} />
      </div>

      <h2 className="mt-7 text-3xl font-bold text-emerald-600">
        {esExterno ? 'Entrada Registrada' : 'Salida Registrada'}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {esExterno
          ? 'Bienvenido'
          : 'Escanea nuevamente al llegar al destino.'}
      </p>

      {esExterno && acompanantes !== null && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-[#315b86]">
          Acompañantes: {acompanantes}
        </p>
      )}

      <button
        type="button"
        onClick={() => onClose?.()}
        className="mt-7 rounded-lg bg-[#17243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d]"
      >
        Cerrar
      </button>
    </div>
  );
}

  if (finalizacion) {
    return (
      <form onSubmit={guardarFinalizacion} className="rounded-xl bg-white p-6">
        <h2 className="text-xl font-bold text-[#17243d]">Segundo QR registrado</h2>
        <p className="mt-2 text-sm text-slate-500">Ingresa el KM final del vehículo.</p>
        <input
          type="number"
          min={Number(finalizacion.traslado.Km_Inicial) + 0.01}
          step="0.01"
          required
          value={kmFinal}
          onChange={(event) => {
            setKmFinal(event.target.value);
            setErrorKm('');
          }}
          placeholder={`42850`}
          className={`mt-5 w-full rounded-lg border p-3 text-sm ${errorKm ? 'border-red-400' : 'border-slate-200'}`}
        />
        {errorKm && <p className="mt-2 text-xs font-semibold text-red-600">{errorKm}</p>}
        {message && <p className="mt-2 text-xs font-semibold text-red-600">{message.text}</p>}
        <button type="submit" disabled={guardandoFinalizacion} className="mt-5 rounded-lg bg-[#17243d] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {guardandoFinalizacion ? 'Guardando...' : 'Finalizar traslado'}
        </button>
      </form>
    );
  }

  if (formatoSalida) {
    return (
      <Formato
        token={formatoSalida.token}
        envio={formatoSalida.data.envio || formatoSalida.data}
        onClose={onClose}
      />
    );
  }

  if (aprobado) {
    return (
      <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-xl bg-white px-6 text-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-full border-[7px] border-emerald-500 text-emerald-500">
          <CheckCircle2 size={112} strokeWidth={2.2} />
        </div>
        <h2 className="mt-7 text-3xl font-bold text-emerald-600">
          {resultadoTipo === 'paqueteria' ? '¡Aprobado!' : 'Llegada Registrada'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {resultadoTipo === 'paqueteria'
            ? 'El envío ha sido registrado exitosamente.'
            : resultadoTipo === 'pendiente-factura'
              ? 'El solicitante debe subir la factura desde Proceso para finalizar el traslado.'
              : 'El traslado fue finalizado correctamente.'}
        </p>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="mt-7 rounded-lg bg-[#17243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d]"
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (qrFinalizado) {
    return (
      <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-xl bg-white px-6 text-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-full border-[7px] border-[#315b86] text-[#315b86]">
          <XCircle size={112} strokeWidth={2.2} />
        </div>
        <h2 className="mt-7 text-2xl font-bold text-[#17243d]">QR vencido</h2>
        <p className="mt-2 text-sm text-slate-500">Este QR cumplió con su ciclo de utilidad.</p>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="mt-7 rounded-lg bg-[#17243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d]"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <>
    <ToastContainer />
      <div className="w-full">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-[#17243d] p-2.5 text-white">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#17243d]">Escanear Código QR</h3>
            <p className="text-xs text-slate-500">ZXing Barcode Scanner</p>
          </div>
        </div>

        {/* Visor de Cámara */}
        <div className="relative h-60 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center">
          <video ref={videoRef} className="h-full w-full object-cover" />

          {!scanning && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-slate-400 bg-slate-950/90">
              Permite el acceso a la cámara para comenzar el escaneo.
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-8">
              <div className="text-5xl font-black tracking-tight text-[#17243d]">
                NA<span className="text-[#77a8d2]">VEW</span>
              </div>
              <div className="mt-8 h-3 w-64 overflow-hidden rounded-full bg-[#e4edf6]">
                <div className="h-full w-1/2 animate-[loadingBar_1.4s_ease-in-out_infinite] rounded-full bg-[#3970a8]" />
              </div>
              <span className="mt-3 text-xs font-medium text-slate-500">Validando código QR...</span>
            </div>
          )}
        </div>

        {/* Selector de cámara */}
        <div className="mt-4 flex items-center gap-2">
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={devices.length === 0}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-[#315b86] disabled:opacity-50"
          >
            {devices.length === 0 && <option value="">No hay cámaras disponibles</option>}
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Cámara ${index + 1}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              // Forzar recarga de dispositivos
              navigator.mediaDevices.enumerateDevices().then((all) => {
                const vids = all.filter((d) => d.kind === 'videoinput');
                setDevices(vids);
                if (vids.length > 0 && !vids.some((d) => d.deviceId === selectedDeviceId)) {
                  setSelectedDeviceId(vids[0].deviceId);
                }
              });
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#315b86] transition hover:bg-slate-50"
            title="Recargar cámaras"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Mensaje de respuesta del backend */}
        {message && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg p-3 text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default Escanear;

Escanear.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onSuccess: PropTypes.func,
  tipo: PropTypes.oneOf(['paqueteria', 'transporte', 'externo']),
};