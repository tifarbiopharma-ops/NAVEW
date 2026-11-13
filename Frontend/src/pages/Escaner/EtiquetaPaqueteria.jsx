import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Formato from './Formato';

const EtiquetaPaqueteria = ({ token, envio, onClose }) => {
  const dialogo = useRef(null);
  useEffect(() => {
    const elemento = dialogo.current;
    const focoAnterior = document.activeElement;
    const overflow = document.body.style.overflow;
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      elemento.close();
      document.body.style.overflow = overflow;
      if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialogo} aria-label="Etiqueta de paquetería" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-borde bg-superficie p-4 shadow-xl backdrop:bg-principal/40 sm:p-6">
      <Formato token={token} envio={envio} onClose={onClose} />
    </dialog>
  );
};

EtiquetaPaqueteria.propTypes = { token: PropTypes.string.isRequired, envio: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired };
export default EtiquetaPaqueteria;
