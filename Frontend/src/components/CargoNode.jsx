import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_WIDTH, NODE_HEIGHT } from './layoutDagre';


function CargoNode({ data }) {
  const planta = String(data.planta || '').trim();
  const colors = data.coloresGerencia;
  const esRaiz = !data.tieneJefe;
  const horizontal = data.direction === 'LR';

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
        h-[var(--cargo-height)] w-[var(--cargo-width)]
        flex-col gap-2.5 rounded-[14px] border-2
        border-[color:var(--cargo-border)]
        bg-[var(--cargo-bg)] px-5 py-[18px] font-sans
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
            uppercase tracking-wide text-white
          "
        >
          Cargo máximo
        </span>
      )}

      <div
        title={data.label}
        className="
          line-clamp-3 text-sm font-bold leading-snug
          text-[color:var(--cargo-text)]
          [overflow-wrap:anywhere]
        "
      >
        {data.label}
      </div>

      <div
        title={data.colaborador || 'Vacante'}
        className={`
          flex shrink-0 items-center gap-1.5 text-xs
          ${
            data.colaborador
              ? 'text-gray-700'
              : 'italic text-gray-500'
          }
        `}
      >
        {data.colaborador && (
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
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </svg>
        )}

        <span className="min-w-0 truncate">
          {data.colaborador || 'Vacante'}
        </span>
      </div>

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