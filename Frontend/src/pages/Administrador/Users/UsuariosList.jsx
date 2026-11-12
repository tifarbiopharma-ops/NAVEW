
import EliminarUsuario from './EliminarUsuario';

const UsuariosList = ({
  usuarios,
  loading,
  onEdit,
  onDelete,
  token
}) => {
  return (
    <div className="w-full min-w-0">
      {loading ? (
        <div className="py-16 text-center text-texto-muted">
          Cargando usuarios...
        </div>
      ) : usuarios.length === 0 ? (
        <div className="py-16 text-center text-texto-muted">
          No se encontraron usuarios.
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-borde">
          <table className="w-full min-w-[980px] table-fixed text-xs xl:text-sm">

            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>

            <thead className="bg-principal text-inverso">
              <tr>
                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  ID
                </th>

                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  Nombre
                </th>

                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  Usuario
                </th>

                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  Correo
                </th>

                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  Cédula
                </th>

                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  Rol
                </th>

                <th className="px-2 py-4 text-left font-semibold tracking-wide">
                  Creado
                </th>

                <th className="px-2 py-4 text-center font-semibold tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-borde bg-superficie">
              {usuarios.map((usuario, index) => (
                <tr
                  key={usuario.id}
                  className={`transition-colors hover:bg-suave ${
                    index % 2 === 0
                      ? 'bg-fondo'
                      : 'bg-superficie'
                  }`}
                >
                  {/* ID */}
                  <td className="px-2 py-4 text-principal">
                    {usuario.id}
                  </td>

                  {/* NOMBRE */}
                  <td className="px-2 py-4 font-medium text-principal break-words">
                    {usuario.nombre || 'Sin nombre'}
                  </td>

                  {/* USERNAME */}
                  <td className="px-2 py-4 font-semibold text-principal break-words">
                    {usuario.username
                      ? String(usuario.username).toUpperCase()
                      : 'Sin asignar'}
                  </td>

                  {/* CORREO */}
                  <td className="px-2 py-4 text-texto-secundario">
                    <span
                      className="block truncate"
                      title={usuario.email || ''}
                    >
                      {usuario.email || '—'}
                    </span>
                  </td>

                  {/* CÉDULA */}
                  <td className="px-2 py-4 text-texto-secundario whitespace-nowrap">
                    {usuario.cedula}
                  </td>

                  {/* ROL - DISEÑO ORIGINAL */}
                  <td className="px-2 py-4">
                    <span
                      title={usuario.rol || ''}
                      className="inline-flex max-w-full items-center rounded-full bg-superficie-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-texto-secundario"
                    >
                      <span className="block truncate">
                        {usuario.rol || '—'}
                      </span>
                    </span>
                  </td>

                  {/* FECHA DE CREACIÓN */}
                  <td className="px-2 py-4 whitespace-nowrap text-texto-secundario">
                    {usuario.created_at
                      ? new Date(
                          usuario.created_at
                        ).toLocaleDateString('es-EC')
                      : '—'}
                  </td>

                  {/* ACCIONES */}
                  <td className="px-2 py-4">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onEdit(usuario)}
                        className="shrink-0 rounded-xl bg-principal px-3 py-2 text-xs font-semibold text-inverso transition hover:bg-principal-hover"
                      >
                        Editar
                      </button>

                      <EliminarUsuario
                        id={usuario.id}
                        onDeleted={onDelete}
                        token={token}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsuariosList;
