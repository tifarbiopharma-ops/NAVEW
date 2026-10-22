
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Send,
  Truck,
  X
} from "lucide-react";

const AvisarLlegada = ({ open, onClose, token }) => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [idUbicacion, setIdUbicacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const baseURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (!open || !token) return;

    const controller = new AbortController();

    const cargarUbicaciones = async () => {
      setCargando(true);
      setError("");
      setExito("");
      setIdUbicacion("");

      try {
        const response = await fetch(
          `${baseURL}/api/aviso-llegada/datos`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.msg || "No se pudieron cargar las plantas."
          );
        }

        setUbicaciones(data.ubicaciones || []);

        setIdUbicacion(
          data.ubicacionActual != null
            ? String(data.ubicacionActual)
            : ""
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarUbicaciones();

    return () => controller.abort();
  }, [open, token, baseURL]);

  const enviarAviso = async () => {
    if (!idUbicacion || enviando) return;

    setEnviando(true);
    setError("");
    setExito("");

    try {
      const response = await fetch(
        `${baseURL}/api/aviso-llegada/enviar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            idUbicacion: Number(idUbicacion)
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || "No se pudo enviar el aviso."
        );
      }

      setExito(data.msg || "Notificación enviada.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (!open) return null;

  const plantaSeleccionada = ubicaciones.find(
    (ubicacion) => String(ubicacion.id) === idUbicacion
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-aviso-llegada"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-[#142744] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5">
              <Truck size={23} />
            </div>

            <div>
              <h2
                id="titulo-aviso-llegada"
                className="text-lg font-bold"
              >
                Avisar llegada
              </h2>

              <p className="text-xs text-slate-300">
                Notificación de camión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar modal"
            className="rounded-lg p-2 transition hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Confirma la planta donde se encuentra el camión.
            Si es diferente a tu ubicación asignada, puedes
            seleccionarla antes de enviar.
          </p>

          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={20} />
              Cargando plantas...
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="planta-llegada"
                className="flex items-center gap-2 text-sm font-semibold text-[#17243d]"
              >
                <MapPin size={17} />
                Planta de llegada
              </label>

              <select
                id="planta-llegada"
                value={idUbicacion}
                onChange={(e) => {
                  setIdUbicacion(e.target.value);
                  setError("");
                  setExito("");
                }}
                disabled={enviando}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#3970a8] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Selecciona una planta
                </option>

                {ubicaciones.map((ubicacion) => (
                  <option
                    key={ubicacion.id}
                    value={ubicacion.id}
                  >
                    {ubicacion.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {plantaSeleccionada && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#285789]">
                Vista previa
              </p>

              <p className="text-sm leading-relaxed text-slate-700">
                🚛 Se informa que el camión ya se encuentra
                en <strong>{plantaSeleccionada.nombre}</strong>.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {exito && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
            >
              <CheckCircle2 size={19} />
              {exito}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={enviarAviso}
              disabled={
                cargando ||
                enviando ||
                !idUbicacion ||
                Boolean(exito)
              }
              className="flex items-center gap-2 rounded-xl bg-[#142744] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#285789] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Send size={17} />
              )}

              {enviando ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvisarLlegada;
