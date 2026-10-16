import EliminarUsuario from './EliminarUsuario';

const UsuariosList = ({ usuarios, loading, onEdit, onDelete, token }) => {
  return (
    <div>
      {loading ? (
        <div className="text-center py-20 text-slate-500">Cargando usuarios...</div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No se encontraron usuarios.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-4 py-4 text-left font-semibold tracking-wide">ID</th>
                <th className="px-4 py-4 text-left font-semibold tracking-wide">Nombre</th>
                <th className="px-4 py-4 text-left font-semibold tracking-wide">Email</th>
                <th className="px-4 py-4 text-left font-semibold tracking-wide">Cédula</th>
                <th className="px-4 py-4 text-left font-semibold tracking-wide">Rol</th>
                <th className="px-4 py-4 text-left font-semibold tracking-wide">Creado</th>
                <th className="px-4 py-4 text-center font-semibold tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {usuarios.map((usuario, index) => (
                <tr key={usuario.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="px-4 py-4 text-slate-800">{usuario.id}</td>
                  <td className="px-4 py-4 text-slate-900 font-medium">{usuario.nombre}</td>
                  <td className="px-4 py-4 text-slate-700">{usuario.email}</td>
                  <td className="px-4 py-4 text-slate-700">{usuario.cedula}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{new Date(usuario.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <button
                        onClick={() => onEdit(usuario)}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <EliminarUsuario id={usuario.id} onDeleted={onDelete} token={token} />
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
