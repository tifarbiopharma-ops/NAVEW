import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { LoaderCircle, Send, UserRound } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';

const API = import.meta.env.VITE_BACKEND_URL;

const obtenerHoraActual = () => {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
};

const initialForm = {
  empresa: '',
  nombre_apellido: '',
  cedula: '',
  telefono: '',
  id_empleado_visitado: '',
  area_visita: '',
  id_planta_destino: '',
  fecha_visita: new Date().toISOString().slice(0, 10),
  hora_ingreso: '',
  hora_salida: '',
  motivo: '',
  numero_acompanantes: 0,
  acompanantes: [],
};

const SolicitudExterno = () => {
  const token = storeAuth((state) => state.token);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    control,
    formState: { errors },
  } = useForm({ defaultValues: initialForm });
  const { fields, replace } = useFieldArray({ control, name: 'acompanantes' });
  const numeroAcompanantes = watch('numero_acompanantes', 0);
  const [catalogos, setCatalogos] = useState({ plantas: [], areas: [], colaboradores: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCatalogos = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API}/api/accesos/catalogos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.msg || 'No se pudieron cargar los catálogos');
        setCatalogos(data);
        const perfil = data.perfilSolicitante;
        if (perfil) {
          const currentValues = getValues();
          if (!currentValues.id_empleado_visitado) setValue('id_empleado_visitado', String(perfil.id));
          if (!currentValues.area_visita) setValue('area_visita', perfil.areaNombre || '');
          if (!currentValues.id_planta_destino) setValue('id_planta_destino', String(perfil.plantaId || ''));
          if (!currentValues.hora_ingreso) setValue('hora_ingreso', obtenerHoraActual());
        } else {
          if (!getValues('hora_ingreso')) setValue('hora_ingreso', obtenerHoraActual());
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogos();
  }, [token, getValues, setValue]);

  useEffect(() => {
    const cantidad = Math.max(0, Math.min(20, Number(numeroAcompanantes) || 0));
    const actuales = getValues('acompanantes') || [];
    if (actuales.length !== cantidad) {
      replace(Array.from({ length: cantidad }, (_, index) => actuales[index] || {
        nombre_apellido: '',
        cedula: '',
      }));
    }
  }, [numeroAcompanantes, getValues, replace]);

  const onSubmit = async (formData) => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/accesos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudo crear la solicitud');
      toast.success('Solicitud de acceso externo creada correctamente');
      reset({
        ...initialForm,
        id_empleado_visitado: formData.id_empleado_visitado,
        area_visita: formData.area_visita,
        id_planta_destino: formData.id_planta_destino,
        hora_ingreso: obtenerHoraActual(),
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const options = (items) => items.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>);
  const areaOptions = catalogos.areas.map((area) => (
    <option key={area.id} value={area.nombre}>{area.nombre}</option>
  ));

  return (
    <div className="min-h-full bg-fondo p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3500} />
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-principal md:text-3xl">Solicitud de Proveedor Externo</h1>
          <p className="mt-1 text-sm text-texto-muted">Registra una nueva solicitud de ingreso de personal externo.</p>
        </div>

        <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-principal p-2 text-inverso"><UserRound size={18} /></div>
            <h2 className="text-lg font-semibold text-principal">Datos de la solicitud</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-texto-muted"><LoaderCircle className="animate-spin" size={18} /> Cargando catálogos...</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Empresa *</span><input {...register('empresa', { required: 'La empresa es obligatoria', maxLength: 100, validate: (value) => value.trim() !== '' || 'La empresa es obligatoria' })} placeholder="Ingrese el nombre de la Empresa" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.empresa && <span className="text-xs text-error">{errors.empresa.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Nombre y Apellido *</span><input {...register('nombre_apellido', { required: 'El nombre es obligatorio', maxLength: 150, validate: (value) => value.trim() !== '' || 'El nombre es obligatorio' })} placeholder="Ingrese el nombre del funcionario" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.nombre_apellido && <span className="text-xs text-error">{errors.nombre_apellido.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">N° Cédula *</span><input {...register('cedula', { required: 'La cédula es obligatoria', maxLength: 20, validate: (value) => value.trim() !== '' || 'La cédula es obligatoria' })} placeholder="Ingrese el número de Cédula" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.cedula && <span className="text-xs text-error">{errors.cedula.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Teléfono *</span><input {...register('telefono', { required: 'El teléfono es obligatorio', maxLength: 20, validate: (value) => value.trim() !== '' || 'El teléfono es obligatorio' })} placeholder="Ingrese el número de teléfono" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.telefono && <span className="text-xs text-error">{errors.telefono.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Número de acompañantes</span><input type="number" min="0" max="20" {...register('numero_acompanantes', { valueAsNumber: true, min: { value: 0, message: 'El mínimo es 0' }, max: { value: 20, message: 'El máximo es 20' } })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.numero_acompanantes && <span className="text-xs text-error">{errors.numero_acompanantes.message}</span>}</label>
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-4 rounded-lg border border-borde-acento bg-suave/40 p-4 md:col-span-2 md:grid-cols-2">
                  <p className="text-xs font-bold text-acento md:col-span-2">Acompañante {index + 1}</p>
                  <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Nombre y Apellido *</span><input {...register(`acompanantes.${index}.nombre_apellido`, { required: 'El nombre es obligatorio', maxLength: 150, validate: (value) => value.trim() !== '' || 'El nombre es obligatorio' })} placeholder="Ingrese el nombre del acompañante" className="w-full rounded-lg border border-borde bg-superficie px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.acompanantes?.[index]?.nombre_apellido && <span className="text-xs text-error">{errors.acompanantes[index].nombre_apellido.message}</span>}</label>
                  <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">N° Cédula *</span><input {...register(`acompanantes.${index}.cedula`, { required: 'La cédula es obligatoria', maxLength: 20, validate: (value) => value.trim() !== '' || 'La cédula es obligatoria' })} placeholder="Ingrese la cédula del acompañante" className="w-full rounded-lg border border-borde bg-superficie px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.acompanantes?.[index]?.cedula && <span className="text-xs text-error">{errors.acompanantes[index].cedula.message}</span>}</label>
                </div>
              ))}
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Persona a quién visita *</span><select {...register('id_empleado_visitado', { required: 'El colaborador es obligatorio', onChange: (event) => {
                const colaborador = catalogos.colaboradores.find((item) => String(item.id) === event.target.value);
                const area = catalogos.areas.find((item) => String(item.id) === String(colaborador?.areaId));
                setValue('area_visita', area?.nombre || colaborador?.areaNombre || '', { shouldValidate: true, shouldDirty: true });
              } })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"><option value="">Seleccione un colaborador</option>{options(catalogos.colaboradores)}</select>{errors.id_empleado_visitado && <span className="text-xs text-error">{errors.id_empleado_visitado.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Área a quién visita *</span><select {...register('area_visita', { required: 'El área es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"><option value="">Seleccione un área</option>{areaOptions}</select>{errors.area_visita && <span className="text-xs text-error">{errors.area_visita.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Planta a la que se dirige *</span><select {...register('id_planta_destino', { required: 'La planta es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"><option value="">Seleccione una planta</option>{options(catalogos.plantas)}</select>{errors.id_planta_destino && <span className="text-xs text-error">{errors.id_planta_destino.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Fecha de la visita *</span><input type="date" {...register('fecha_visita', { required: 'La fecha es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.fecha_visita && <span className="text-xs text-error">{errors.fecha_visita.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Hora de ingreso</span><input type="time" {...register('hora_ingreso')} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-principal">Hora de salida *</span><input type="time" {...register('hora_salida', { required: 'La hora de salida es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.hora_salida && <span className="text-xs text-error">{errors.hora_salida.message}</span>}</label>
              <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold text-principal">Motivo de la visita *</span><textarea {...register('motivo', { required: 'El motivo de la visita es obligatorio', validate: (value) => value.trim() !== '' || 'El motivo de la visita es obligatorio' })} rows={3} placeholder="Ingrese el detalle de la visita" className="w-full resize-none rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.motivo && <span className="text-xs text-error">{errors.motivo.message}</span>}</label>
              <div className="md:col-span-2"><button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-principal px-5 py-2.5 text-sm font-semibold text-inverso transition hover:bg-principal-hover disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{saving ? 'Guardando...' : 'Guardar solicitud'}</button></div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default SolicitudExterno;
