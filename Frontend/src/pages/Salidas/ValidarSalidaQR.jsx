import { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserQRCodeReader } from '@zxing/browser';
import { QrCode, CheckCircle2, XCircle, Camera, LoaderCircle } from 'lucide-react';
import storeAuth from '../../context/storeAuth';

const API = import.meta.env.VITE_BACKEND_URL;

const ValidarSalidaQR = () => {
  const token = storeAuth((state) => state.token);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraOptions, setCameraOptions] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [scanHint, setScanHint] = useState('Centra el QR dentro del marco');
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const isProcessingRef = useRef(false);
  const qrRegionId = 'qr-reader';

  const stopCamera = () => {
    if (scannerRef.current?.stop) {
      scannerRef.current.stop().catch(() => {});
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    scannerRef.current = null;
  };

  const resetScan = () => {
    setResult(null);
    setError('');
    setLoading(false);
    setScanHint('Centra el QR dentro del marco');
    isProcessingRef.current = false;
    if (selectedCameraId) {
      startCamera(selectedCameraId);
    }
  };

  const requestCameraAccess = async () => {
    setError('');
    setLoading(false);
    setScanHint('Centra el QR dentro del marco');
    isProcessingRef.current = false;
    setIsCameraStarting(true);
    setCameraReady(false);

    try {
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('El escáner QR requiere HTTPS o localhost para acceder a la cámara.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Este navegador no soporta acceso a la cámara.');
      }

      const permissionStatus = navigator.permissions && navigator.permissions.query
        ? await navigator.permissions.query({ name: 'camera' }).catch(() => null)
        : null;

      if (permissionStatus?.state === 'denied') {
        throw new Error('La cámara está bloqueada en este navegador. Habilítala en la configuración del navegador y recarga la página.');
      }

      const grantStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      grantStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameraOptions(videoDevices);

      const firstDeviceId = videoDevices[0]?.deviceId || '';
      setSelectedCameraId(firstDeviceId);
      setCameraPermissionGranted(true);

      if (firstDeviceId) {
        await startCamera(firstDeviceId);
      }
    } catch (e) {
      setCameraPermissionGranted(false);
      setError(e.message || 'La cámara no está disponible en este dispositivo o navegador.');
      setCameraReady(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  const startCamera = async (cameraIdOverride) => {
    const requestedCameraId = cameraIdOverride || selectedCameraId;

    if (!requestedCameraId) {
      return;
    }

    setError('');
    setLoading(false);
    setScanHint('Centra el QR dentro del marco');
    isProcessingRef.current = false;
    setIsCameraStarting(true);
    setCameraReady(false);

    try {
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('El escáner QR requiere HTTPS o localhost para acceder a la cámara.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Este navegador no soporta acceso a la cámara.');
      }

      const permissionStatus = navigator.permissions && navigator.permissions.query
        ? await navigator.permissions.query({ name: 'camera' }).catch(() => null)
        : null;

      if (permissionStatus?.state === 'denied') {
        throw new Error('La cámara está bloqueada en este navegador. Habilítala en la configuración del navegador y recarga la página.');
      }

      stopCamera();

      const videoElement = videoRef.current;
      if (!videoElement) return;

      const codeReader = new BrowserQRCodeReader();
      scannerRef.current = codeReader;

      const constraints = {
        audio: false,
        video: {
          deviceId: { exact: requestedCameraId },
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameraOptions(videoDevices);
      setSelectedCameraId(requestedCameraId || videoDevices[0]?.deviceId || '');

      videoElement.srcObject = stream;
      await videoElement.play();

      const controls = await codeReader.decodeFromVideoDevice(
        requestedCameraId,
        videoElement,
        async (decodedResult, err) => {
          if (decodedResult && !isProcessingRef.current) {
            const points = decodedResult.getResultPoints?.() || [];
            const videoWidth = videoElement.videoWidth || videoElement.clientWidth;
            const videoHeight = videoElement.videoHeight || videoElement.clientHeight;
            const pointCenter = points.length
              ? {
                  x: points.reduce((total, point) => total + point.getX(), 0) / points.length,
                  y: points.reduce((total, point) => total + point.getY(), 0) / points.length,
                }
              : null;
            const horizontalMargin = videoWidth * 0.2;
            const verticalMargin = videoHeight * 0.2;

            if (pointCenter && (
              pointCenter.x < horizontalMargin
              || pointCenter.x > videoWidth - horizontalMargin
              || pointCenter.y < verticalMargin
              || pointCenter.y > videoHeight - verticalMargin
            )) {
              setScanHint('Mueve el QR al centro del marco');
              return;
            }

            isProcessingRef.current = true;
            setLoading(true);
            setScanHint('QR centrado. Procesando...');
            setError('');
            controls?.stop?.();
            stream.getTracks().forEach((track) => track.stop());
            try {
              const raw = (() => {
                const text = String(decodedResult.getText() || '').trim();
                try {
                  return decodeURIComponent(text);
                } catch (error) {
                  return text;
                }
              })();

              let parsed = {};

              try {
                parsed = JSON.parse(raw);
              } catch (readError) {
                const parts = raw.split('|');
                if (parts[0] === 'FARBIO-SALIDA' && parts.length >= 12) {
                  parsed = {
                    codigo: parts[2],
                    solicitante: parts[3],
                    area_origen: parts[5],
                    destino: parts[6],
                    departamento: parts[7],
                    motivo: parts[8],
                    fecha_salida: parts[9],
                    estado: parts[10],
                  };
                }
              }

              const payload = {
                codigo: parsed.codigo || parsed.id || parsed.data || raw,
                area_origen: parsed.area_origen,
                destino: parsed.destino,
                departamento: parsed.departamento,
                motivo: parsed.motivo,
                fecha_salida: parsed.fecha_salida,
                solicitante: parsed.solicitante,
              };

              const response = await fetch(`${API}/api/salidas/validate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });

              const data = await response.json();
              if (!response.ok || data?.success === false) {
                throw new Error(data?.msg || 'No se pudo validar la salida');
              }

              setError('');
              setResult({ success: true, ...data });
            } catch (scanError) {
              setError(scanError.message || 'No se pudo leer el QR');
              setResult({ success: false, msg: scanError.message || 'QR inválido' });
            } finally {
              setLoading(false);
            }
          }

          if (err && !String(err).includes('NotFoundException')) {
            console.warn('ZXing error:', err);
          }
        },
      );

      scannerRef.current = {
        stop: async () => {
          controls?.stop?.();
          stream.getTracks().forEach((track) => track.stop());
          if (videoElement) {
            videoElement.srcObject = null;
          }
        },
      };

      setCameraReady(true);
    } catch (e) {
      setError(e.message || 'La cámara no está disponible en este dispositivo o navegador.');
      setCameraReady(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  useEffect(() => {
    requestCameraAccess();

    return () => {
      stopCamera();
      setResult(null);
      setError('');
      setLoading(false);
      setCameraReady(false);
    };
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      stopCamera();
      setResult(null);
      setError('');
      setLoading(false);
    };

    window.addEventListener('auth:logout', handleForcedLogout);
    return () => {
      stopCamera();
      window.removeEventListener('auth:logout', handleForcedLogout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-[#17243D] p-2 text-white">
            <Camera size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Escáner QR</p>
            <h1 className="text-3xl font-bold text-slate-900">Validación de salida aprobada</h1>
            <div className="mt-3 space-y-1 text-slate-600">
              <p className="text-base font-medium text-slate-700">Escanea el QR generado por la salida aprobada</p>
              <p className="text-sm">El sistema valida que los datos de origen, destino, departamento, motivo y aprobador coincidan con lo registrado.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div
            id={qrRegionId}
            className="relative min-h-90 w-full overflow-hidden rounded-2xl bg-black"
            style={{ minHeight: '360px', height: '360px', width: '100%' }}
          >
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
              style={{ display: 'block' }}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[2.5px] border-white bg-white/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.24)] md:h-72.5 md:w-72.5">
              <span className="absolute -left-0.5 -top-0.5 h-7 w-7 rounded-tl-[18px] border-l-4 border-t-4 border-white" />
              <span className="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tr-[18px] border-r-4 border-t-4 border-white" />
              <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-[18px] border-b-4 border-l-4 border-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-br-[18px] border-b-4 border-r-4 border-white" />
            </div>
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">
              {scanHint}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {!cameraPermissionGranted ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                <Camera size={16} className="animate-pulse" />
                {isCameraStarting ? 'Solicitando permiso de cámara...' : 'Esperando permiso de cámara...'}
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Cámara</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    const nextCameraId = e.target.value;
                    setSelectedCameraId(nextCameraId);
                    setError('');
                    if (nextCameraId) {
                      startCamera(nextCameraId);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#3d5a80]"
                >
                  {cameraOptions.length === 0 ? (
                    <option value="">Sin cámaras detectadas</option>
                  ) : (
                    cameraOptions.map((camera) => (
                      <option key={camera.deviceId || camera.id} value={camera.deviceId || camera.id}>
                        {camera.label || `Cámara ${camera.deviceId || camera.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
              <div className="flex min-h-70 w-full max-w-105 flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-2xl">
                <LoaderCircle className="mb-6 animate-spin text-[#17243D]" size={76} strokeWidth={1.5} />
                <h2 className="text-2xl font-extrabold text-slate-900">Procesando QR</h2>
                <p className="mt-2 text-sm text-slate-500">Estamos validando los datos de la salida</p>
              </div>
            </div>
          ) : result ? (
            <div className="mt-4 space-y-4">
              {result.success ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
                  <div className="w-full max-w-130 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                    <div className="rounded-2xl border border-[#9ed7b9] bg-[#dff4e5] p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#eafaf1] text-[#1e9f62] shadow-sm">
                            <CheckCircle2 size={72} strokeWidth={1.8} />
                          </div>
                          <span className="text-[15px] font-extrabold uppercase tracking-[0.18em] text-[#1f3a34]">Salida aprobada</span>
                        </div>
                        <button
                          type="button"
                          onClick={resetScan}
                          className="rounded-full border border-[#a7d6ba] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[#1f3a34] transition hover:bg-white"
                        >
                          Volver
                        </button>
                      </div>

                      <div className="mt-4 space-y-3 text-[15px] text-[#1a5a42]">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-[#1e9f62]" />
                          <span>Salida validada correctamente.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-[#1e9f62]" />
                          <span>La salida aprobada fue verificada</span>
                        </div>
                      </div>
                    </div>

                    {result?.salida && (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="space-y-3 text-[15px] text-slate-700">
                          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                            <span className="font-medium text-slate-600">Código:</span>
                            <strong className="text-right text-slate-900">{result.salida.codigo}</strong>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                            <span className="font-medium text-slate-600">Solicitante:</span>
                            <strong className="text-right text-slate-900">{result.salida.solicitante_nombre}</strong>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                            <span className="font-medium text-slate-600">Origen:</span>
                            <strong className="text-right text-slate-900">{result.salida.area_origen}</strong>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                            <span className="font-medium text-slate-600">Destino:</span>
                            <strong className="text-right text-slate-900">{result.salida.destino}</strong>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                            <span className="font-medium text-slate-600">Departamento:</span>
                            <strong className="text-right text-slate-900">{result.salida.departamento}</strong>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                            <span className="font-medium text-slate-600">Estado:</span>
                            <strong className="text-right capitalize text-slate-900">{result.salida.estado}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
                  <div className="w-full max-w-130 rounded-2xl border border-[#f3b7b7] bg-[#fce7e7] p-5 shadow-2xl">
                    <div className="flex items-center justify-between gap-3 text-[#d44d4d]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#f9d8d8]">
                          <XCircle size={86} strokeWidth={1.6} />
                        </div>
                        <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">QR no válido</span>
                      </div>
                      <button
                        type="button"
                        onClick={resetScan}
                        className="rounded-full border border-[#e9b0b0] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[#b14f4f] transition hover:bg-white"
                      >
                        Volver
                      </button>
                    </div>

                    <p className="mt-4 text-[15px] leading-7 text-[#b14f4f]">
                      {result.msg && result.msg.toLowerCase().includes('exist')
                        ? 'Este código ya fue usado o no existe.'
                        : result.msg && result.msg.toLowerCase().includes('aprob')
                          ? 'Este código ya fue usado o no existe.'
                          : result.msg && result.msg.toLowerCase().includes('vál')
                            ? 'Este código ya fue usado o no existe.'
                            : result.msg || error || 'Este código ya fue usado o no existe.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {error && !result && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidarSalidaQR;
