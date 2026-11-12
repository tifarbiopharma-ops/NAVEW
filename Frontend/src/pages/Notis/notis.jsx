
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-principal/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-aviso-llegada"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-superficie shadow-2xl"
      >
        <div className="flex items-center justify-between bg-principal px-6 py-5 text-inverso">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-superficie/10 p-2.5">
              <Truck size={23} />
            </div>

            <div>
              <h2
                id="titulo-aviso-llegada"
                className="text-lg font-bold"
              >
                Avisar llegada
              </h2>

              <p className="text-xs text-nav-texto">
                Notificación de camión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar modal"
            className="rounded-lg p-2 transition hover:bg-superficie/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <p className="text-sm leading-relaxed text-texto-secundario">
            Confirma la planta donde se encuentra el camión.
            Si es diferente a tu ubicación asignada, puedes
            seleccionarla antes de enviar.
          </p>

          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-texto-muted">
              <Loader2 className="animate-spin" size={20} />
              Cargando plantas...
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="planta-llegada"
                className="flex items-center gap-2 text-sm font-semibold text-principal"
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
                className="w-full rounded-xl border border-borde-fuerte bg-fondo px-4 py-3 text-sm font-medium text-principal outline-none transition focus:border-marca focus:ring-2 focus:ring-suave"
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
            <div className="rounded-xl border border-borde-acento bg-suave p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-acento">
                Vista previa
              </p>

              <p className="text-sm leading-relaxed text-texto-secundario">
                🚛 Se informa que el camión ya se encuentra
                en <strong>{plantaSeleccionada.nombre}</strong>.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-error-fondo px-4 py-3 text-sm text-error"
            >
              {error}
            </p>
          )}

          {exito && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl bg-exito-fondo px-4 py-3 text-sm font-medium text-exito"
            >
              <CheckCircle2 size={19} />
              {exito}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-borde-suave pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="rounded-xl border border-borde px-4 py-2.5 text-sm font-semibold text-texto-secundario transition hover:bg-fondo"
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
              className="flex items-center gap-2 rounded-xl bg-principal px-5 py-2.5 text-sm font-semibold text-inverso transition hover:bg-acento disabled:cursor-not-allowed disabled:opacity-50"
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
