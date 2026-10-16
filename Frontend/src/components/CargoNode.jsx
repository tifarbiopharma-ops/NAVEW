import { Handle, Position } from '@xyflow/react';

const COLORES_PLANTA = {
  'OFICINAS CENTRALES': { bg: '#eff6ff', border: '#3b82f6', texto: '#1e3a8a' },
  'PLANTA INDUSTRIAL':  { bg: '#f0fdf4', border: '#22c55e', texto: '#14532d' },
  'SUCURSAL NORTE':     { bg: '#fef3c7', border: '#f59e0b', texto: '#78350f' },
  'SUCURSAL SUR':       { bg: '#fce7f3', border: '#ec4899', texto: '#831843' },
};

const COLOR_DEFAULT = { bg: '#f9fafb', border: '#9ca3af', texto: '#111827' };

export default function CargoNode({ data }) {
  const colors = COLORES_PLANTA[data.planta] || COLOR_DEFAULT;
  const esRaiz = !data.tieneJefe;

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 220,
        maxWidth: 260,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: esRaiz
          ? `0 0 0 4px ${colors.border}33, 0 4px 12px rgba(0,0,0,.08)`
          : '0 2px 6px rgba(0,0,0,.06)',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {esRaiz && (
        <span
          style={{
            position: 'absolute', top: -10, right: 10,
            background: colors.border, color: '#fff',
            fontSize: 10, fontWeight: 700,
            padding: '3px 8px', borderRadius: 6,
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}
        >
          Cargo máximo
        </span>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: colors.texto, lineHeight: 1.25, marginBottom: 6 }}>
        {data.label}
      </div>

      {data.colaborador ? (
        <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>
          👤 {data.colaborador}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, fontStyle: 'italic' }}>
          Vacante
        </div>
      )}

      {data.planta && (
        <div style={{ fontSize: 11, color: colors.texto, opacity: 0.75 }}>
          📍 {data.planta}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}