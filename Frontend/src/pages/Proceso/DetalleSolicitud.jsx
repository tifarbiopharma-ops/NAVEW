import { useEffect, useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight, ClipboardList, MapPin, UserRound, X } from 'lucide-react';

const titulos = {
  transporte: 'Solicitud de transporte',
  paqueteria: 'Solicitud de paquetería',
  externo: 'Solicitud de acceso externo',
};

const fechaLegible = (valor) => {
  const fecha = String(valor || '').slice(0, 10);
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : 'Sin fecha registrada';
};

const DetalleSolicitud = ({ solicitud, modulo, estadoTexto, claseEstado, onClose }) => {
  const dialogo = useRef(null);
  const tituloId = useId();
  const esExterno = modulo === 'externo';
  const datos = [
    { etiqueta: esExterno ? 'Fecha de visita' : 'Fecha de salida', valor: fechaLegible(solicitud.date) },
    { etiqueta: esExterno ? 'Área de visita' : modulo === 'transporte' ? 'Tipo de transporte' : 'Área de destino', valor: solicitud.area },
    ...(esExterno ? [
      { etiqueta: 'Hora de ingreso', valor: solicitud.entryTime },
      { etiqueta: 'Hora de salida', valor: solicitud.exitTime },
    ] : []),
  ];
  const datosVisitante = [
    { etiqueta: 'Nombre', valor: solicitud.provider },
    { etiqueta: 'Empresa', valor: solicitud.company },
    { etiqueta: 'Cédula', valor: solicitud.identification },
    { etiqueta: 'Teléfono', valor: solicitud.phone },
    { etiqueta: 'Acompañantes', valor: solicitud.companions ?? 0 },
  ];

  useEffect(() => {
    const elemento = dialogo.current;
    const focoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      elemento.close();
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-borde bg-superficie p-0 text-principal shadow-2xl backdrop:bg-principal/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-borde px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden shrink-0 rounded-xl bg-suave p-3 text-acento sm:block" aria-hidden="true">
              <ClipboardList size={22} />
            </div>
            <div className="min-w-0">
              <h2 id={tituloId} className="text-lg font-bold leading-snug sm:text-xl">{titulos[modulo] || 'Detalle de la solicitud'}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-semibold tracking-wide text-texto-muted">{solicitud.code}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${claseEstado}`}>{estadoTexto}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-texto-muted transition hover:bg-superficie-muted hover:text-principal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center gap-3 rounded-xl bg-fondo p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-borde bg-superficie text-acento" aria-hidden="true">
              <UserRound size={19} />
            </div>
            <dl className="min-w-0">
              <dt className="text-xs font-medium text-texto-muted">Solicitante</dt>
              <dd className="mt-1 break-words text-sm font-semibold leading-relaxed">{solicitud.requester}</dd>
            </dl>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {datos.map(({ etiqueta, valor }) => (
              <div key={etiqueta} className="min-w-0">
                <dt className="text-xs font-medium text-texto-muted">{etiqueta}</dt>
                <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{valor || 'Sin información'}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-3 rounded-xl border border-borde p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            {!esExterno && <>
              <div className="min-w-0">
                <p className="mb-1.5 text-xs font-medium text-texto-muted">Planta de origen</p>
                <p className="break-words text-sm font-semibold leading-relaxed">{solicitud.origin || 'Sin origen indicado'}</p>
              </div>
              <ArrowRight size={18} className="ml-0.5 rotate-90 text-enfasis sm:mx-1 sm:rotate-0" aria-hidden="true" />
            </>}
            <div className={`min-w-0 ${esExterno ? 'sm:col-span-3' : ''}`}>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-texto-muted">
                <MapPin size={13} aria-hidden="true" />
                <span>{esExterno ? 'Planta de visita' : 'Planta de destino'}</span>
              </p>
              <p className="break-words text-sm font-semibold leading-relaxed">{solicitud.destination}</p>
            </div>
          </div>

          {esExterno && (
            <section className="border-t border-borde pt-5" aria-label="Datos del visitante">
              <h3 className="mb-3 text-sm font-semibold">Visitante</h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {datosVisitante.map(({ etiqueta, valor }) => (
                  <div key={etiqueta} className="min-w-0">
                    <dt className="text-xs font-medium text-texto-muted">{etiqueta}</dt>
                    <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{valor ?? 'Sin información'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <dl className="rounded-xl border border-borde-acento bg-fondo p-4">
            <dt className="text-xs font-semibold text-acento">Motivo</dt>
            <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-texto-secundario">{solicitud.reason || 'Sin motivo indicado'}</dd>
          </dl>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-borde bg-fondo/70 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-principal px-6 py-2.5 text-sm font-semibold text-inverso transition hover:bg-principal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento sm:w-auto"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </dialog>
  );
};

DetalleSolicitud.propTypes = {
  solicitud: PropTypes.shape({
    code: PropTypes.string,
    requester: PropTypes.string,
    area: PropTypes.string,
    date: PropTypes.string,
    origin: PropTypes.string,
    destination: PropTypes.string,
    reason: PropTypes.string,
    provider: PropTypes.string,
    company: PropTypes.string,
    identification: PropTypes.string,
    phone: PropTypes.string,
    entryTime: PropTypes.string,
    exitTime: PropTypes.string,
    companions: PropTypes.number,
  }).isRequired,
  modulo: PropTypes.string.isRequired,
  estadoTexto: PropTypes.string.isRequired,
  claseEstado: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DetalleSolicitud;
