/* ────────────────────────────────────────────────────────────────────────────
 *  App.tsx — Solver de Horario Universitario (CSP)
 *
 *  Puerto fiel del programa de consola en C++17:
 *    · Variables = asignaturas · Dominio = paralelos
 *    · Restricción dura = no compartir celda (día, clave) — AND de máscaras
 *    · Fuerza bruta completa; la optimización SOLO ordena, nunca filtra
 *    · Política "todo o nada": sin horarios parciales
 *
 *  Sin persistencia: al refrescar la página se reinicia todo (por diseño).
 * ──────────────────────────────────────────────────────────────────────────── */

import { useCallback, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  Cpu,
  Play,
  Plus,
  RotateCcw,
  X,
} from "lucide-react"

import { Asignatura, PALETTE, SIGLA_RE, Sesion } from "./lib/domain"
import {
  MAX_SOLUCIONES,
  ResultadoSolver,
  Solucion,
  frentePareto,
  mejorPorHorario,
  mejorPorVentanas,
  resolver,
} from "./lib/solver"
import { ScheduleGrid, buildGrid, buildOnline } from "./components/ScheduleGrid"
import { CourseItem } from "./components/CourseItem"
import { ResultsPanel } from "./components/ResultsPanel"
import { EleccionParalelo } from "./lib/solver"

export default function App() {
  const [asignaturas, setAsignaturas] = useState<Record<string, Asignatura>>({})
  const [resultado, setResultado] = useState<ResultadoSolver | null>(null)
  const [seleccionada, setSeleccionada] = useState<Solucion | null>(null)
  const [resolviendo, setResolviendo] = useState(false)

  const [nuevaSigla, setNuevaSigla] = useState("")
  const [siglaError, setSiglaError] = useState("")
  const [mostrarAlta, setMostrarAlta] = useState(false)

  const paletaIdx = useRef(0)

  /* ── Invalidación ────────────────────────────────────────────────────────
   * Toda mutación del registro deja obsoletas las soluciones ya calculadas.
   * Sin esto, resolver → borrar una asignatura → seguir mostrando horarios con
   * la asignatura eliminada (el bug que arreglamos en el C++).               */
  const invalidar = () => {
    setResultado(null)
    setSeleccionada(null)
  }

  /* ── CRUD de asignaturas y paralelos (opciones 1–4 del menú) ── */
  const addAsignatura = (raw: string) => {
    const sigla = raw.toUpperCase().trim()
    if (!SIGLA_RE.test(sigla)) {
      setSiglaError("Formato inválido — ej: ICI4247")
      return
    }
    if (asignaturas[sigla]) {
      setSiglaError("La asignatura ya existe en el registro")
      return
    }
    const color = PALETTE[paletaIdx.current % PALETTE.length]
    paletaIdx.current++
    setAsignaturas(prev => ({ ...prev, [sigla]: { sigla, paralelos: {}, color } }))
    setNuevaSigla("")
    setSiglaError("")
    setMostrarAlta(false)
    invalidar()
  }

  const removeAsignatura = (sigla: string) => {
    setAsignaturas(prev => {
      const copia = { ...prev }
      delete copia[sigla]
      return copia
    })
    invalidar()
  }

  const addSesion = (sigla: string, numero: number, sesion: Sesion) => {
    setAsignaturas(prev => {
      const asignatura = prev[sigla]
      if (!asignatura) return prev
      const previo = asignatura.paralelos[numero]
      return {
        ...prev,
        [sigla]: {
          ...asignatura,
          paralelos: {
            ...asignatura.paralelos,
            [numero]: {
              numero,
              sesiones: previo ? [...previo.sesiones, sesion] : [sesion],
            },
          },
        },
      }
    })
    invalidar()
  }

  const removeParalelo = (sigla: string, numero: number) => {
    setAsignaturas(prev => {
      const asignatura = prev[sigla]
      if (!asignatura) return prev
      const paralelos = { ...asignatura.paralelos }
      delete paralelos[numero]
      return { ...prev, [sigla]: { ...asignatura, paralelos } }
    })
    invalidar()
  }

  /* ── Datos de ejemplo ── */
  const cargarDemo = useCallback(() => {
    paletaIdx.current = 4
    setAsignaturas({
      ICI4247: {
        sigla: "ICI4247",
        color: PALETTE[0],
        paralelos: {
          1: {
            numero: 1,
            sesiones: [
              { dia: 0, clave: 0, online: false },
              { dia: 2, clave: 0, online: false },
            ],
          },
          2: {
            numero: 2,
            sesiones: [
              { dia: 1, clave: 1, online: false },
              { dia: 3, clave: 1, online: false },
            ],
          },
        },
      },
      ICA4161: {
        sigla: "ICA4161",
        color: PALETTE[1],
        paralelos: {
          1: { numero: 1, sesiones: [{ dia: 1, clave: 0, online: false }] },
          2: { numero: 2, sesiones: [{ dia: 1, clave: 1, online: false }] },
          3: { numero: 3, sesiones: [{ dia: 4, clave: 2, online: false }] },
        },
      },
      MAT1630: {
        sigla: "MAT1630",
        color: PALETTE[2],
        paralelos: {
          1: {
            numero: 1,
            sesiones: [
              { dia: 0, clave: 3, online: false },
              { dia: 4, clave: 3, online: false },
            ],
          },
          2: {
            numero: 2,
            sesiones: [
              { dia: 1, clave: 2, online: false },
              { dia: 3, clave: 2, online: false },
            ],
          },
          3: {
            numero: 3,
            sesiones: [
              { dia: 0, clave: 6, online: false },
              { dia: 2, clave: 6, online: false },
            ],
          },
        },
      },
      ING3461: {
        sigla: "ING3461",
        color: PALETTE[3],
        paralelos: {
          1: { numero: 1, sesiones: [{ dia: 4, clave: 0, online: false }] },
          // Paralelo 100% remoto: dos marcas ONLINE, nunca choca con nadie.
          2: {
            numero: 2,
            sesiones: [
              { dia: -1, clave: -1, online: true },
              { dia: -1, clave: -1, online: true },
            ],
          },
        },
      },
    })
    invalidar()
  }, [])

  /* ── Resolver (opción 5) ── */
  const handleResolver = useCallback(() => {
    setResolviendo(true)
    // setTimeout: cede un frame para que el botón pinte su estado antes del
    // backtracking (que es síncrono y puede tardar).
    window.setTimeout(() => {
      const res = resolver(asignaturas)
      setResultado(res)
      const orden = [...res.soluciones].sort(mejorPorVentanas)
      setSeleccionada(orden.length > 0 ? orden[0] : null)
      setResolviendo(false)
    }, 50)
  }, [asignaturas])

  /* ── Derivados ── */
  const listaAsignaturas = useMemo(
    () => Object.values(asignaturas).sort((a, b) => a.sigla.localeCompare(b.sigla)),
    [asignaturas],
  )

  const totalParalelos = useMemo(
    () => listaAsignaturas.reduce((n, a) => n + Object.keys(a.paralelos).length, 0),
    [listaAsignaturas],
  )

  const soluciones = resultado?.soluciones ?? []

  const orden = useMemo(() => [...soluciones].sort(mejorPorVentanas), [soluciones])
  const pareto = useMemo(() => frentePareto(soluciones), [soluciones])
  const mejorV = orden.length > 0 ? orden[0] : null
  const mejorH = useMemo(
    () => (soluciones.length > 0 ? [...soluciones].sort(mejorPorHorario)[0] : null),
    [soluciones],
  )

  // Vista previa: todos los paralelos configurados superpuestos (los choques se
  // pintan en rojo). Vista de solución: solo los paralelos elegidos.
  const eleccionesVisibles: EleccionParalelo[] = useMemo(() => {
    if (seleccionada) return seleccionada.elecciones
    return listaAsignaturas.flatMap(a =>
      Object.values(a.paralelos)
        .sort((x, y) => x.numero - y.numero)
        .map(p => ({
          sigla: a.sigla,
          numero: p.numero,
          sesiones: p.sesiones,
          color: a.color,
        })),
    )
  }, [seleccionada, listaAsignaturas])

  const grid = useMemo(() => buildGrid(eleccionesVisibles), [eleccionesVisibles])
  const online = useMemo(() => buildOnline(eleccionesVisibles), [eleccionesVisibles])

  const indiceSeleccionada = seleccionada
    ? orden.findIndex(s => s.firma === seleccionada.firma)
    : -1

  const sinSolucion = resultado !== null && resultado.soluciones.length === 0

  return (
    <div
      className="size-full flex flex-col overflow-hidden"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(75,123,236,0.15)", border: "1px solid rgba(75,123,236,0.3)" }}
          >
            <Calendar size={14} style={{ color: "#93c5fd" }} />
          </div>
          <div>
            <h1
              className="text-sm font-bold tracking-tight leading-none mb-0.5"
              style={{ fontFamily: "'Libre Baskerville', serif" }}
            >
              Solver de Horario
            </h1>
            <div className="flex items-center gap-1.5">
              <Cpu size={8} style={{ color: "var(--muted-foreground)" }} />
              <span
                className="text-[9px] tracking-widest uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                CSP · Backtracking completo
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {listaAsignaturas.length > 0 && (
            <div
              className="flex items-center gap-2 text-[10px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span className="font-mono">{listaAsignaturas.length} asignaturas</span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span className="font-mono">{totalParalelos} paralelos</span>
              {resultado !== null && (
                <>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span
                    className="font-mono"
                    style={{ color: soluciones.length > 0 ? "#86efac" : "#fca5a5" }}
                  >
                    {soluciones.length} soluciones
                  </span>
                </>
              )}
            </div>
          )}
          <button
            onClick={handleResolver}
            disabled={resolviendo || totalParalelos === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {resolviendo ? (
              <>
                <span className="animate-pulse">◉</span> Resolviendo…
              </>
            ) : (
              <>
                <Play size={11} fill="currentColor" /> Resolver
              </>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Izquierda: registro de asignaturas ── */}
        <aside
          className="w-72 shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <BookOpen size={11} style={{ color: "var(--muted-foreground)" }} />
              <span>Asignaturas</span>
            </div>
            <button
              onClick={() => {
                setMostrarAlta(!mostrarAlta)
                setSiglaError("")
              }}
              className="p-1 rounded transition-opacity hover:opacity-70 cursor-pointer"
              style={{ color: mostrarAlta ? "var(--primary)" : "var(--muted-foreground)" }}
            >
              {mostrarAlta ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>

          {mostrarAlta && (
            <div
              className="px-3 py-2.5 shrink-0"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
            >
              <label
                className="block text-[9px] uppercase tracking-widest mb-1.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                Sigla de asignatura
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={nuevaSigla}
                  onChange={e => {
                    setNuevaSigla(e.target.value.toUpperCase())
                    setSiglaError("")
                  }}
                  onKeyDown={e => e.key === "Enter" && addAsignatura(nuevaSigla)}
                  placeholder="ICI4247"
                  className="flex-1 px-2.5 py-1.5 rounded text-xs focus:outline-none uppercase"
                  style={{
                    background: "var(--input-background)",
                    border: siglaError ? "1px solid var(--destructive)" : "1px solid var(--border)",
                    color: "var(--foreground)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  autoFocus
                />
                <button
                  onClick={() => addAsignatura(nuevaSigla)}
                  className="px-2.5 py-1.5 rounded transition-opacity hover:opacity-80 cursor-pointer"
                  style={{
                    background: "rgba(75,123,236,0.2)",
                    border: "1px solid rgba(75,123,236,0.35)",
                    color: "#93c5fd",
                  }}
                >
                  <Check size={12} />
                </button>
              </div>
              {siglaError && (
                <div
                  className="flex items-center gap-1 mt-1.5 text-[10px]"
                  style={{ color: "var(--destructive)" }}
                >
                  <AlertCircle size={9} /> {siglaError}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ scrollbarWidth: "none" }}>
            {listaAsignaturas.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-3xl opacity-10">⬡</div>
                <div className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Añade asignaturas y configura
                  <br />
                  sus paralelos para comenzar
                </div>
                <button
                  onClick={cargarDemo}
                  className="text-[10px] underline underline-offset-2 transition-opacity hover:opacity-70 cursor-pointer"
                  style={{ color: "var(--primary)" }}
                >
                  Cargar datos de ejemplo
                </button>
              </div>
            ) : (
              <>
                {listaAsignaturas.map(a => (
                  <CourseItem
                    key={a.sigla}
                    asignatura={a}
                    onRemoveCourse={removeAsignatura}
                    onRemoveParalelo={removeParalelo}
                    onAddSesion={addSesion}
                  />
                ))}
                <button
                  onClick={cargarDemo}
                  className="w-full py-1.5 text-[9px] uppercase tracking-widest transition-opacity hover:opacity-60 mt-2 cursor-pointer"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Reemplazar con demo
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ── Centro: grilla ── */}
        <main className="flex-1 overflow-auto flex flex-col p-6 gap-4 min-w-0">
          <div className="flex items-start justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-sm font-semibold mb-0.5">
                {seleccionada
                  ? `Solución ${indiceSeleccionada + 1} / ${orden.length}`
                  : "Vista previa"}
              </h2>
              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                {seleccionada ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    {mejorV && seleccionada.firma === mejorV.firma && (
                      <span style={{ color: "#fef08a" }}>★ Mejor ventanas</span>
                    )}
                    {mejorH && seleccionada.firma === mejorH.firma && (
                      <span style={{ color: "#86efac" }}>★ Mejor horario</span>
                    )}
                    <span>
                      Ventanas: {seleccionada.scoreVentanas} · Horario (promedio de clave):{" "}
                      {seleccionada.promedioClave.toFixed(2)}
                    </span>
                  </span>
                ) : (
                  "Todos los paralelos configurados, superpuestos — los choques salen en rojo"
                )}
              </div>
            </div>

            {seleccionada && (
              <button
                onClick={() => setSeleccionada(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] transition-opacity hover:opacity-70 shrink-0 cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                <RotateCcw size={9} /> Vista previa
              </button>
            )}
          </div>

          {listaAsignaturas.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl"
              style={{ border: "1px dashed var(--border)" }}
            >
              <div className="text-center">
                <div className="text-[40px] opacity-5 mb-4">◫</div>
                <p className="text-sm font-medium mb-1">Grilla de horario</p>
                <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  Añade asignaturas en el panel izquierdo para comenzar
                </p>
              </div>
            </div>
          ) : (
            <ScheduleGrid grid={grid} online={online} />
          )}

          {/* Avisos: excluidas / truncado / sin solución */}
          {resultado !== null && resultado.excluidas.length > 0 && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg shrink-0"
              style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}
            >
              <AlertCircle size={14} style={{ color: "#fef08a" }} />
              <p className="text-xs" style={{ color: "#fef08a" }}>
                Sin paralelos, excluidas de la búsqueda:{" "}
                <span className="font-mono">{resultado.excluidas.join(", ")}</span>
              </p>
            </div>
          )}

          {resultado?.truncado && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg shrink-0"
              style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}
            >
              <AlertCircle size={14} style={{ color: "#fef08a" }} />
              <p className="text-xs" style={{ color: "#fef08a" }}>
                Búsqueda truncada en {MAX_SOLUCIONES.toLocaleString("es-CL")} soluciones (el producto
                cartesiano crece exponencialmente). Quita paralelos poco atractivos para acotarla.
              </p>
            </div>
          )}

          {sinSolucion && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg shrink-0"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={14} style={{ color: "#fca5a5" }} />
              <p className="text-xs" style={{ color: "#fca5a5" }}>
                No hay solución posible que cumpla con las restricciones. Es "todo o nada": no se
                arman horarios parciales. Revisa los paralelos que chocan (en rojo) o añade otro.
              </p>
            </div>
          )}
        </main>

        {/* ── Derecha: resultados ── */}
        {mejorV && mejorH && orden.length > 0 && (
          <ResultsPanel
            orden={orden}
            pareto={pareto}
            mejorV={mejorV}
            mejorH={mejorH}
            seleccionada={seleccionada}
            onSelect={setSeleccionada}
          />
        )}
      </div>
    </div>
  )
}
