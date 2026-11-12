
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import '../../index.css';

const FilaFormato = ({ etiqueta, valor }) => (
  <div className="grid grid-cols-[42%_58%] border-b border-black last:border-b-0">
    <div className="border-r border-black px-2 py-2 text-[10px] font-bold uppercase text-texto-secundario">{etiqueta}</div>
    <div className="min-w-0 break-words px-2 py-2 text-xs font-medium text-principal">{valor ?? '-'}</div>
  </div>
);

const formatearIdPaquete = (id) => {
  if (!id || id === '-') return '-';

  return `PAQ-${String(id).split('-')[0].toUpperCase()}`;
};

const formatearFecha = (fecha) => {
  if (!fecha || fecha === '-') return '-';

  return String(fecha).slice(0, 10);
};

const Formato = ({ token, envio, onClose }) => {
  const dato = (alias, columna) => envio?.[alias] ?? envio?.[columna] ?? '-';

  return (
    <div className="formato-mensajeria-container w-full">
      <div className="qr-print-area w-full bg-white text-black">
        <header className="formato-cabecera border-b-[4px] border-black">
          <div className="formato-logos grid grid-cols-3 items-center gap-3 px-3 pt-3">
            <img src="/clarel.png" alt="Clarel" className="mx-auto h-14 w-full object-contain" />
            <img src="/logo.png" alt="FarbioPharma" className="mx-auto h-14 w-full object-contain" />
            <img src="/inpel.png" alt="Inpel" className="mx-auto h-14 w-full object-contain" />
          </div>
          <h2 className="px-3 pb-2 pt-2 text-center text-[12px] font-bold uppercase tracking-wide">
            Identificación de mensajería interna
          </h2>
        </header>

        <section className="formato-cuerpo p-4">
          <div className="formato-contenido flex flex-wrap items-start gap-4">
            <div className="formato-datos min-w-[230px] flex-1 overflow-hidden border border-black">
              <FilaFormato etiqueta="Tipo de contenido" valor={dato('tipo_contenido', 'Tipo_Contenido')} />
              <FilaFormato etiqueta="Responsable origen" valor={dato('responsable_origen', 'NOMBRE_Responsable')} />
              <FilaFormato etiqueta="Lugar de origen" valor={dato('lugar_origen', 'Nombre_Planta_Origen')} />
              <FilaFormato etiqueta="Lugar destino" valor={dato('lugar_destino', 'Nombre_Planta_Destino')} />
              <FilaFormato etiqueta="Departamento destino" valor={dato('departamento_destino', 'AREA_Destino')} />
              <FilaFormato etiqueta="Responsable destino" valor={dato('responsable_destino', 'NOMBRE_Destinatario')} />
            </div>

            <div className="formato-qr flex shrink-0 flex-col items-center border border-black p-3">
              <QRCodeSVG
                value={String(token ?? '')}
                size={160}
                level="H"
                includeMargin
              />
                <p>
                  ID: {formatearIdPaquete(dato('id_paquete', 'ID_Paquete'))}
                </p>
              <div className="mt-2 w-full border-t border-black pt-2 text-center text-[10px] font-semibold">
                <p>
                  Fecha: {formatearFecha(dato('fecha_salida', 'Fecha_Salida'))}
                </p>
                <p>
                  Hora: {dato('hora_entrega', 'Hora_Entrega')}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-texto-secundario">
            Paquete 1 de 2
          </p>
        </section>
      </div>

      <div className="mt-4 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-principal px-4 py-2.5 text-sm font-semibold text-inverso"
        >
          <Printer size={16} />
          Imprimir
        </button>

        <button
          type="button"
          onClick={() => onClose?.()}
          className="rounded-lg border border-borde-fuerte px-4 py-2.5 text-sm font-semibold text-texto-secundario"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default Formato;
