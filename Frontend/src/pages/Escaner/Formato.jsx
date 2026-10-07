import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const FilaFormato = ({ etiqueta, valor, className = '' }) => (
  <div className={`grid grid-cols-[42%_58%] border-b border-slate-300 last:border-b-0 ${className}`}>
    <div className="border-r border-slate-300 px-2 py-2 text-[10px] font-bold uppercase text-slate-500">
      {etiqueta}
    </div>
    <div className="wrap-break-word px-2 py-2 text-xs font-medium text-[#17243d]">{valor || '-'}</div>
  </div>
);

const Formato = ({ token, envio, onClose }) => {
  const imprimirFormato = () => window.print();
  const dato = (alias, columna) => envio?.[alias] || envio?.[columna];

  return (
    <div className="qr-print-area w-full rounded-xl border border-slate-200 bg-white p-5">
      <div className="etiqueta-cabecera mb-5 flex items-start justify-between gap-4 border-b border-slate-300 pb-4">
        <img src="/logo.png" alt="FarbioPharma" className="h-16 w-36 object-contain object-left" />
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-[#17243d]">
            Identificación mensajería interna
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Salida registrada</p>
        </div>
      </div>

      <div className="etiqueta-contenido flex items-start gap-4">
        <div className="etiqueta-datos min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-300">
          <FilaFormato etiqueta="Tipo de contenido" valor={dato('tipo_contenido', 'Tipo_Contenido')} />
          <FilaFormato etiqueta="Responsable origen" valor={dato('responsable_origen', 'NOMBRE_Responsable')} />
          <FilaFormato etiqueta="Lugar de origen" valor={dato('lugar_origen', 'Nombre_Planta_Origen')} />
          <FilaFormato etiqueta="Lugar destino" valor={dato('lugar_destino', 'Nombre_Planta_Destino')} />
          <FilaFormato etiqueta="Departamento destino" valor={dato('departamento_destino', 'AREA_Destino')} />
          <FilaFormato etiqueta="Responsable destino" valor={dato('responsable_destino', 'NOMBRE_Destinatario')} />
        </div>

        <div className="etiqueta-qr flex shrink-0 flex-col items-center rounded-lg border border-slate-300 p-3">
          <QRCodeSVG value={token} size={180} level="H" includeMargin />
          <p className="etiqueta-token mt-2 max-w-44 break-all text-center text-[9px] text-slate-500">{token}</p>
          <div className="mt-2 border-t border-slate-200 pt-2 text-center text-[10px] font-semibold text-[#17243d]">
            <p>ID: {dato('id_paquete', 'ID_Paquete')}</p>
            <p>Fecha: {dato('fecha_salida', 'Fecha_Salida')}</p>
            <p>Hora: {dato('hora_entrega', 'Hora_Entrega')}</p>
          </div>
        </div>
      </div>

      <div className="etiqueta-pie mt-4 flex items-center justify-between text-[10px] text-slate-500">
        <span className="etiqueta-contador">Paquete 1 de 2</span>
      </div>

      <div className="mt-5 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={imprimirFormato}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#17243d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d]"
        >
          <Printer size={16} />
          Imprimir / Guardar PDF
        </button>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default Formato;
