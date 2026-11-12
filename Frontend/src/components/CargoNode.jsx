import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_WIDTH, NODE_HEIGHT } from './layoutDagre';

const COLOR_DEFAULT = {
  bg: '#f9fafb',
  border: '#9ca3af',
  texto: '#111827',
};

function CargoNode({ data }) {
  const planta = String(data.planta || '').trim();
  const colors = data.coloresGerencia || COLOR_DEFAULT;
  const esRaiz = !data.tieneJefe;
  const horizontal = data.direction === 'LR';
  const mostrarTodos = Boolean(data.mostrarColaboradores);

  const colaboradores = (
    Array.isArray(data.colaboradores)
      ? data.colaboradores
      : String(data.colaborador || '').split(',')
  )
    .map((nombre) => String(nombre || '').trim())
    .filter(Boolean);

  const visibles = mostrarTodos
    ? colaboradores
    : colaboradores.slice(0, 2);

  return (
    <div
      style={{
        '--cargo-width': `${NODE_WIDTH}px`,
        '--cargo-height': `${NODE_HEIGHT}px`,
        '--cargo-bg': colors.bg,
        '--cargo-border': colors.border,
        '--cargo-text': colors.texto,
        '--cargo-ring': `${colors.border}33`,
      }}
      className={`
        relative box-border flex
        min-h-[var(--cargo-height)] w-[var(--cargo-width)]
        flex-col gap-2 rounded-[14px] border-2
        border-[color:var(--cargo-border)]
        bg-[var(--cargo-bg)] px-4 py-3
        [font-family:inherit]
        ${
          esRaiz
            ? 'shadow-md ring-4 ring-[color:var(--cargo-ring)]'
            : 'shadow-sm'
        }
      `}
    >
      {!esRaiz && (
        <Handle
          type="target"
          position={horizontal ? Position.Left : Position.Top}
          isConnectable={false}
          className="opacity-0"
        />
      )}

      {esRaiz && (
        <span
          className="
            absolute -top-[13px] right-3.5
            rounded-[7px] bg-[var(--cargo-border)]
            px-2.5 py-1 text-[10px] font-bold
            uppercase tracking-wide text-inverso
          "
        >
          Cargo máximo
        </span>
      )}

      {/* Nombre del cargo */}
      <div
        title={data.label}
        className="
          shrink-0 text-sm font-bold leading-snug
          text-[color:var(--cargo-text)]
          whitespace-normal [overflow-wrap:anywhere]
        "
      >
        {data.label}
      </div>

      {/* Colaboradores */}
      <div className="flex-1">
        {colaboradores.length > 0 ? (
          <>
            <ul className="m-0 list-none space-y-1 p-0 text-xs text-texto-secundario">
              {visibles.map((nombre, index) => (
                <li
                  key={`${nombre}-${index}`}
                  className="flex items-start gap-1.5"
                  title={nombre}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                  </svg>

                  <span
                    className={
                      mostrarTodos
                        ? 'min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]'
                        : 'min-w-0 flex-1 truncate'
                    }
                  >
                    {nombre}
                  </span>
                </li>
              ))}
            </ul>

            {!mostrarTodos && colaboradores.length > 2 && (
              <p className="mb-0 mt-1 text-[10px] text-texto-muted">
                +{colaboradores.length - 2} colaboradores
              </p>
            )}
          </>
        ) : (
          <p className="m-0 text-xs italic text-texto-muted">
            Vacante
          </p>
        )}
      </div>

      {/* Planta */}
      {planta && (
        <div
          title={planta}
          className="
            mt-auto flex shrink-0 items-center gap-1.5
            text-[11px] text-[color:var(--cargo-text)]
            opacity-80
          "
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>

          <span className="min-w-0 truncate">{planta}</span>
        </div>
      )}

      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        isConnectable={false}
        className="opacity-0"
      />
    </div>
  );
}

export default memo(CargoNode);