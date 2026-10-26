import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import getLayoutedElements, {
  obtenerColoresPorRama,
} from "../../../components/layoutDagre";
import CargoNode from "../../../components/CargoNode";
import { useOrganigrama } from "../../../hooks/useOrganigrama";
import storeAuth from "../../../context/storeAuth";
const nodeTypes = {
  cargo: CargoNode,
};
const BUTTON_CLASSES =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";
const FIELD_CLASSES =
  "block h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const normalizar = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
function crearPaleta(hex) {
  const canales = hex
    .slice(1)
    .match(/.{2}/g)
    .map((parte) => parseInt(parte, 16));
  const convertir = (valores) =>
    `#${valores.map((valor) => Math.round(valor).toString(16).padStart(2, "0")).join("")}`;
  return {
    border: hex,
    // Fondo claro y texto oscuro derivados del color elegido.
    bg: convertir(canales.map((valor) => 255 * 0.92 + valor * 0.08)),
    texto: convertir(canales.map((valor) => valor * 0.3)),
  };
}
const POSICIONES_KEY = "navew-organigrama-posiciones-v1";
function leerPosiciones() {
  try {
    const resultado = JSON.parse(
      sessionStorage.getItem(POSICIONES_KEY) || "{}",
    );
    return resultado &&
      typeof resultado === "object" &&
      !Array.isArray(resultado)
      ? resultado
      : {};
  } catch {
    return {};
  }
}
function guardarPosiciones(nodes, direction) {
  try {
    const anteriores = leerPosiciones();
    anteriores._direction = direction;
    anteriores[direction] = Object.fromEntries(
      nodes.map((node) => [
        node.id,
        {
          x: node.position.x,
          y: node.position.y,
        },
      ]),
    );
    sessionStorage.setItem(POSICIONES_KEY, JSON.stringify(anteriores));
    return true;
  } catch {
    return false;
  }
}
function OrganigramaInner() {
  const { data, loading, error, recargar } = useOrganigrama();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [direction, setDirection] = useState(() =>
    leerPosiciones()._direction === "LR" ? "LR" : "TB",
  );
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [cargoId, setCargoId] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [bloqueado, setBloqueado] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const coloresPersonalizados = useRef({});
  const bloqueoRef = useRef(true);
  const guardandoRef = useRef(false);
  const nodesInitialized = useNodesInitialized();
  const { fitView, viewportInitialized, getNodes } = useReactFlow();
  const token = storeAuth((state) => state.token);
  const [guardando, setGuardando] = useState(false);
  const [hayCambiosColor, setHayCambiosColor] = useState(false);
  const inputNodes = data?.nodes;
  const inputEdges = data?.edges;
  useEffect(() => {
    coloresPersonalizados.current = {
      ...(data?.coloresPersonalizados || {}),
    };
    setHayCambiosColor(false);
  }, [data]);
  useEffect(() => {
    const sourceNodes = inputNodes || [];
    const sourceEdges = inputEdges || [];
    const conJefe = new Set(sourceEdges.map((edge) => edge.target));
    const rawNodes = sourceNodes.map((node) => ({
      ...node,
      type: "cargo",
      data: {
        ...node.data,
        tieneJefe: conJefe.has(node.id),
      },
    }));
    const layout = getLayoutedElements(
      rawNodes,
      sourceEdges,
      direction,
      coloresPersonalizados.current,
    );
    const posiciones = leerPosiciones()[direction] || {};
    const restaurados = layout.nodes.map((node) => {
      const posicion = posiciones[node.id];
      if (
        !posicion ||
        !Number.isFinite(posicion.x) ||
        !Number.isFinite(posicion.y)
      ) {
        return node;
      }
      return {
        ...node,
        position: {
          x: posicion.x,
          y: posicion.y,
        },
      };
    });
    setNodes(restaurados);
    setEdges(layout.edges);
    setLayoutVersion((version) => version + 1);
  }, [inputNodes, inputEdges, direction, setNodes, setEdges]);

  // Encuadrar solo cuando cambia la distribución, no al mover tarjetas.
  useEffect(() => {
    if (!nodesInitialized || !viewportInitialized || !layoutVersion) return;
    const frame = requestAnimationFrame(() => {
      fitView({
        padding: 0.15,
        minZoom: 0.65,
        maxZoom: 0.85,
        duration: 400,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [nodesInitialized, viewportInitialized, layoutVersion, fitView]);
  const cargoSeleccionado = nodes.find((node) => node.id === cargoId);
  function alternarBloqueo() {
    const siguiente = !bloqueoRef.current;
    if (siguiente && !guardarPosiciones(getNodes(), direction)) {
      setMensaje("No se pudieron conservar las posiciones en esta pestaña.");
      return;
    }
    bloqueoRef.current = siguiente;
    setBloqueado(siguiente);
    setMensaje(
      siguiente
        ? "Tarjetas bloqueadas. Los colores se pueden seguir editando."
        : "Tarjetas desbloqueadas para moverlas.",
    );
  }
  const cargosOrdenados = useMemo(
    () =>
      [...nodes].sort((a, b) =>
        String(a.data.label).localeCompare(String(b.data.label), "es"),
      ),
    [nodes],
  );
  const resultadosEmpleados = useMemo(() => {
    const texto = normalizar(busqueda);
    if (!texto) return [];
    return cargosOrdenados.flatMap((node) => {
      const nombres = Array.isArray(node.data.colaboradores)
        ? node.data.colaboradores
        : node.data.colaborador
          ? [node.data.colaborador]
          : [];
      return nombres
        .filter((nombre) => normalizar(nombre).includes(texto))
        .map((nombre) => ({
          nodeId: node.id,
          nombre,
          cargo: node.data.label,
        }));
    });
  }, [cargosOrdenados, busqueda]);
  function seleccionarCargo(id) {
    const node = nodes.find((item) => item.id === id);
    setCargoId(id);
    if (!node) return;
    setColor(node.data.coloresGerencia?.border || "#3b82f6");
    fitView({
      nodes: [
        {
          id,
        },
      ],
      padding: 0.5,
      minZoom: 0.85,
      maxZoom: 1,
      duration: 400,
    });
  }
  function aplicarColor() {
    if (!cargoSeleccionado || guardandoRef.current) return;
    coloresPersonalizados.current = {
      ...coloresPersonalizados.current,
      [cargoId]: crearPaleta(color),
    };
    setNodes((actuales) => {
      const colores = obtenerColoresPorRama(
        actuales,
        edges,
        coloresPersonalizados.current,
      );
      return actuales.map((node) => ({
        ...node,
        data: {
          ...node.data,
          coloresGerencia: colores.get(node.id) || null,
        },
      }));
    });
    setHayCambiosColor(true);
    setMensaje("Color aplicado. Pulsa «Guardar cambios» para conservarlo.");
  }
  function cambiarOrientacion(valor) {
    if (bloqueoRef.current) return;
    if (!guardarPosiciones(getNodes(), direction)) {
      setMensaje("No se pudo conservar la distribución actual.");
      return;
    }
    try {
      const posiciones = leerPosiciones();
      posiciones._direction = valor;
      sessionStorage.setItem(POSICIONES_KEY, JSON.stringify(posiciones));
    } catch {
      setMensaje("No se pudo conservar la orientación.");
      return;
    }
    setDirection(valor);
    setMensaje("Orientación cambiada. Los colores se conservan.");
  }
  async function guardarCambios() {
    if (guardandoRef.current || !hayCambiosColor) return;
    if (!token) {
      setMensaje("Tu sesión no está disponible. Vuelve a iniciar sesión.");
      return;
    }
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/jerarquia/organigrama/colores`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            coloresPersonalizados: coloresPersonalizados.current,
          }),
        },
      );
      const resultado = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resultado.msg || "No se pudieron guardar los colores");
      }
      setHayCambiosColor(false);
      setMensaje("Colores guardados correctamente.");
    } catch (error) {
      setMensaje(error.message || "Error guardando los colores");
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }
  function alTerminarDeMover(_, node, movidos) {
    if (bloqueoRef.current) return;
    const actualizados = new Map(
      (movidos?.length ? movidos : [node]).map((item) => [
        item.id,
        item.position,
      ]),
    );
    const actuales = getNodes().map((item) => ({
      ...item,
      position: actualizados.get(item.id) || item.position,
    }));
    if (!guardarPosiciones(actuales, direction)) {
      setMensaje("No se pudieron conservar las posiciones en esta pestaña.");
    }
  }
  function gestionarCambiosNodos(changes) {
    const permitidos = bloqueoRef.current
      ? changes.filter(
          (change) => change.type === "dimensions" || change.type === "select",
        )
      : changes;
    onNodesChange(permitidos);
  }
  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-80px)] min-h-[420px] w-full flex-col items-center justify-center gap-4 bg-slate-50 font-sans text-sm text-slate-600">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p role="status">Cargando organigrama…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100dvh-80px)] min-h-[420px] w-full flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center font-sans">
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
        <button type="button" className={BUTTON_CLASSES} onClick={recargar}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 font-sans text-slate-900 shadow-sm">
      <header className="z-10 flex shrink-0 flex-col gap-5 border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Organigrama
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{nodes.length} cargos</span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${bloqueado ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}
              >
                {bloqueado
                  ? "Tarjetas bloqueadas"
                  : "Puedes mover las tarjetas"}
              </span>
              {hayCambiosColor && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                  Colores sin guardar
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={BUTTON_CLASSES}
              disabled={!nodes.length}
              onClick={alternarBloqueo}
              title={bloqueado ? "Desbloquear tarjetas" : "Bloquear tarjetas"}
              aria-label={bloqueado ? "Desbloquear tarjetas" : "Bloquear tarjetas"}
              aria-pressed={bloqueado}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path
                  d={
                    bloqueado
                      ? "M8 10V7a4 4 0 0 1 8 0v3"
                      : "M8 10V7a4 4 0 0 1 8 0"
                  }
                />
                <path d="M12 14v3" />
              </svg>
            </button>
            <button
              type="button"
              className={BUTTON_CLASSES}
              onClick={() => window.location.reload()}
            >
              ⟳ 
            </button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-4">
            <label
              htmlFor="organigrama-empleado"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Buscar empleado
            </label>
            <input
              id="organigrama-empleado"
              type="search"
              placeholder="Escribe el nombre del empleado…"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className={FIELD_CLASSES}
              aria-controls="organigrama-resultados"
            />
          </div>

          <div className="min-w-0 xl:col-span-4">
            <label
              htmlFor="organigrama-cargo"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Seleccionar cargo
            </label>
            <select
              id="organigrama-cargo"
              value={cargoId}
              onChange={(event) => seleccionarCargo(event.target.value)}
              className={FIELD_CLASSES}
            >
              <option value="">Selecciona un cargo</option>
              {cargosOrdenados.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.data.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 md:col-span-2 xl:col-span-4">
            <label
              htmlFor="organigrama-color"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Color de la rama
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="organigrama-color"
                type="color"
                value={color}
                disabled={guardando || !cargoSeleccionado}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button
                type="button"
                className={BUTTON_CLASSES}
                disabled={guardando || !cargoSeleccionado}
                onClick={aplicarColor}
              >
                Aplicar a la rama
              </button>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={guardando || !hayCambiosColor}
                onClick={guardarCambios}
                aria-busy={guardando}
              >
                {guardando ? "Guardando…" : " Guardar cambios"}
              </button>
            </div>
          </div>
        </div>

        <div
          id="organigrama-resultados"
          className={
            busqueda.trim()
              ? "max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2"
              : "hidden"
          }
        >
          {busqueda.trim() && (
            <>
              {!resultadosEmpleados.length && (
                <p className="px-3 py-2 text-sm text-slate-500" role="status">
                  No se encontraron empleados.
                </p>
              )}
              <div className="grid gap-1 sm:grid-cols-2">
                {resultadosEmpleados.map((resultado, index) => (
                  <button
                    type="button"
                    key={`${resultado.nodeId}-${resultado.nombre}-${index}`}
                    className="min-w-0 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    onClick={() => seleccionarCargo(resultado.nodeId)}
                  >
                    <span className="block break-words text-sm font-semibold text-slate-800">
                      {resultado.nombre}
                    </span>
                    <span className="mt-0.5 block break-words text-xs text-slate-500">
                      {resultado.cargo}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={BUTTON_CLASSES}
              disabled={bloqueado || direction === "TB"}
              onClick={() => cambiarOrientacion("TB")}
              aria-pressed={direction === "TB"}
            >
              ↕ Vertical
            </button>
            <button
              type="button"
              className={BUTTON_CLASSES}
              disabled={bloqueado || direction === "LR"}
              onClick={() => cambiarOrientacion("LR")}
              aria-pressed={direction === "LR"}
            >
              ↔ Horizontal
            </button>
            <button
              type="button"
              className={BUTTON_CLASSES}
              onClick={() =>
                fitView({
                  padding: 0.15,
                  minZoom: 0.02,
                  maxZoom: 1,
                  duration: 400,
                })
              }
            >
              ⛶ Ver todo
            </button>
          </div>
          <p
            className="min-w-0 max-w-xl break-words text-xs leading-relaxed text-slate-600"
            role="status"
            aria-live="polite"
          >
            {mensaje}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Guarda los colores con «Guardar cambios». El candado controla las
          tarjetas y la orientación. Las posiciones se conservan al recargar
          esta pestaña y las tarjetas se abren bloqueadas.
        </p>
      </header>

      <div className="relative h-[65vh] min-h-[420px] w-full shrink-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={gestionarCambiosNodos}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => seleccionarCargo(node.id)}
          onNodeDragStop={alTerminarDeMover}
          nodesDraggable={!bloqueado}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          minZoom={0.02}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="#dbe3ed" />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

const Organigrama = () => {
  return (
    <ReactFlowProvider>
      <OrganigramaInner />
    </ReactFlowProvider>
  );
}
export default Organigrama;