import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { LoaderCircle, Truck, X } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;

const ConductorAsignado = ({ paquetes, token, onClose, onAsignado }) => {
  const dialogo = useRef(null);
  const [conductores, setConductores] = useState([]);
  const [conductor, setConductor] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const elemento = dialogo.current;
    const foco = document.activeElement;
    const overflow = document.body.style.overflow;
    const controller = new AbortController();
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    fetch(`${API}/api/envios/conductores`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.msg); return data; })
      .then((data) => { if (!controller.signal.aborted) setConductores(data.conductores || []); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message || 'No se pudieron cargar los conductores'); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => { controller.abort(); elemento.close(); document.body.style.overflow = overflow; if (foco?.isConnected) foco.focus(); };
  }, [token]);

  const guardar = async (event) => {
    event.preventDefault();
    if (guardando || !conductor) return;
    setGuardando(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/envios/conductor`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ idConductor: Number(conductor), paquetes: paquetes.map((p) => p.id) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'No se pudo guardar la asignación');
      onAsignado(data.msg);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  return (
    <dialog ref={dialogo} aria-labelledby="titulo-conductor-asignado" onCancel={(e) => { e.preventDefault(); if (!guardando) onClose(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-borde bg-superficie p-0 text-principal shadow-xl backdrop:bg-principal/40">
      <form onSubmit={guardar}>
        <header className="flex items-center gap-3 border-b border-borde p-5"><Truck className="text-advertencia" size={24} aria-hidden="true" /><h2 id="titulo-conductor-asignado" className="flex-1 text-lg font-bold">Asignar conductor</h2><button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-fondo disabled:opacity-50"><X size={18} /></button></header>
        <div className="space-y-4 p-5">
          <p className="text-sm text-texto-secundario">Selecciona quién transportará los <strong>{paquetes.length} paquetes</strong> seleccionados.</p>
          <label className="block space-y-2 text-sm font-semibold">Conductor<select required value={conductor} onChange={(e) => setConductor(e.target.value)} disabled={cargando || guardando} className="block w-full rounded-lg border border-borde bg-fondo p-3 font-normal outline-none focus:border-acento"><option value="">{cargando ? 'Cargando conductores...' : 'Selecciona un conductor'}</option>{conductores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          {!cargando && !conductores.length && <p className="text-sm text-texto-muted">No hay conductores activos disponibles.</p>}
          <ul className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-borde bg-fondo p-3 text-xs" aria-label="Paquetes seleccionados">{paquetes.map((p) => <li key={p.id}><strong>{p.code}</strong> · {p.destination}<p className="mt-1 text-texto-muted">{p.conductorNombre ? `Conductor actual: ${p.conductorNombre}` : 'Sin conductor asignado'}</p></li>)}</ul>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </div>
        <footer className="space-y-2 border-t border-borde bg-fondo p-5"><button type="submit" disabled={!conductor || cargando || guardando} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-principal p-3 text-sm font-semibold text-inverso hover:bg-principal-hover disabled:opacity-50">{guardando && <LoaderCircle size={16} className="animate-spin" />} {guardando ? 'Guardando...' : 'Guardar asignación'}</button><button type="button" onClick={onClose} disabled={guardando} className="min-h-11 w-full rounded-lg text-sm text-texto-secundario hover:bg-superficie">Cancelar</button></footer>
      </form>
    </dialog>
  );
};

ConductorAsignado.propTypes = { paquetes: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, code: PropTypes.string, destination: PropTypes.string, conductorNombre: PropTypes.string })).isRequired, token: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired, onAsignado: PropTypes.func.isRequired };
export default ConductorAsignado;
