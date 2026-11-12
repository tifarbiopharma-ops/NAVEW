const etiquetasRol = {
  administrador: 'Administrador',
  solicitante: 'Solicitante',
  jefe: 'Jefe',
  supervisor: 'Supervisor',
  subgerente: 'Subgerente',
  gerente: 'Gerente',
  subgerentegeneral: 'Subgerente general',
  gerentegeneral: 'Gerente general',
  presidente: 'Presidente',
  talentohumano: 'Talento Humano',
};

export const etiquetaRolUsuario = (rol) =>
  etiquetasRol[String(rol || '').toLowerCase().replace(/\s+/g, '')] || rol || 'Usuario';
