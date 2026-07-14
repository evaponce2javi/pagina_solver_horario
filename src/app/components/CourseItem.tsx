/* ────────────────────────────────────────────────────────────────────────────
 *  CourseItem.tsx — Una asignatura del panel izquierdo, con sus paralelos y el
 *  formulario de alta de sesiones (espejo de las opciones 2, 3 y 4 del menú).
 * ──────────────────────────────────────────────────────────────────────────── */

import { useState } from "react"
import { AlertCircle, ChevronDown, ChevronRight, Plus, Trash2, Wifi, X } from "lucide-react"
import {
  Asignatura,
  CLAVES,
  DIAS,
  DIAS_SHORT,
  Paralelo,
  Sesion,
  existeSesion,
} from "../lib/domain"

/* ── Formulario: añadir una sesión a un paralelo ── */
function AddSesionForm({
  paralelos,
  onAdd,
  onClose,
}: {
  paralelos: Record<number, Paralelo>
  onAdd: (numero: number, sesion: Sesion) => void
  onClose: () => void
}) {
  const [num, setNum] = useState("")
  const [online, setOnline] = useState(false)
  const [dia, setDia] = useState(0)
  const [clave, setClave] = useState(0)
  const [error, setError] = useState("")

  const handleAdd = () => {
    const texto = num.trim()
    // Entero estricto NO negativo (espejo de parsearEntero en Utilidades.cpp).
    if (!/^[0-9]+$/.test(texto)) {
      setError("Ingrese un número válido (ej. 1)")
      return
    }
    const numero = Number(texto)
    if (numero < 1) {
      setError("El número de paralelo debe ser ≥ 1")
      return
    }

    const sesion: Sesion = online ? { dia: -1, clave: -1, online: true } : { dia, clave, online: false }

    // Unicidad (día, clave) SOLO para presenciales: varias ONLINE sí se permiten.
    if (existeSesion(paralelos[numero], sesion)) {
      setError("Esa sesión ya existe para este paralelo")
      return
    }

    onAdd(numero, sesion)
    setNum("")
    setError("")
  }

  return (
    <div
      className="mt-1.5 p-2.5 rounded-lg space-y-2"
      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">
            Paralelo #
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={num}
            onChange={e => {
              setNum(e.target.value)
              setError("")
            }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="1"
            className="w-full px-2 py-1.5 rounded text-xs focus:outline-none"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--foreground)",
            }}
            autoFocus
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setOnline(!online)
              setError("")
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] transition-colors"
            style={{
              background: online ? "rgba(20,184,166,0.15)" : "var(--card)",
              border: `1px solid ${online ? "#14b8a6" : "var(--border)"}`,
              color: online ? "#99f6e4" : "var(--muted-foreground)",
            }}
          >
            <Wifi size={9} /> Online
          </button>
        </div>
      </div>

      {!online && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">
              Día
            </label>
            <select
              value={dia}
              onChange={e => setDia(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded text-xs focus:outline-none"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {DIAS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">
              Clave
            </label>
            <select
              value={clave}
              onChange={e => setClave(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded text-xs focus:outline-none"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {CLAVES.map((c, i) => (
                <option key={i} value={i}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--destructive)" }}>
          <AlertCircle size={9} /> {error}
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={handleAdd}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-opacity hover:opacity-80"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus size={9} /> Agregar sesión
        </button>
        <button
          onClick={onClose}
          className="px-2.5 py-1.5 rounded transition-opacity hover:opacity-70"
          style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )
}

/* ── Asignatura colapsable ── */
export function CourseItem({
  asignatura,
  onRemoveCourse,
  onRemoveParalelo,
  onAddSesion,
}: {
  asignatura: Asignatura
  onRemoveCourse: (sigla: string) => void
  onRemoveParalelo: (sigla: string, numero: number) => void
  onAddSesion: (sigla: string, numero: number, sesion: Sesion) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [adding, setAdding] = useState(false)

  const paralelos = Object.values(asignatura.paralelos).sort((a, b) => a.numero - b.numero)
  const sinParalelos = paralelos.length === 0

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div
        className="flex items-center gap-2 px-3 py-2 group"
        style={{ background: asignatura.color.bg }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
        >
          {expanded ? (
            <ChevronDown size={10} style={{ color: asignatura.color.text, opacity: 0.7 }} />
          ) : (
            <ChevronRight size={10} style={{ color: asignatura.color.text, opacity: 0.7 }} />
          )}
          <span
            className="text-xs font-semibold tracking-wide"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: asignatura.color.text }}
          >
            {asignatura.sigla}
          </span>
          <span className="text-[10px]" style={{ color: asignatura.color.text, opacity: 0.5 }}>
            {paralelos.length} paralelo{paralelos.length !== 1 ? "s" : ""}
          </span>
          {sinParalelos && (
            <span
              className="text-[9px] px-1 rounded"
              style={{
                background: "rgba(234,179,8,0.15)",
                color: "#fef08a",
                border: "1px solid rgba(234,179,8,0.3)",
              }}
              title="Sin paralelos: será excluida al resolver"
            >
              excluida
            </span>
          )}
        </button>
        <button
          onClick={() => onRemoveCourse(asignatura.sigla)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
          style={{ color: asignatura.color.text }}
          title="Eliminar asignatura"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-2 space-y-1.5" style={{ background: "rgba(7,11,20,0.6)" }}>
          {sinParalelos && (
            <p className="text-[10px] text-center py-2" style={{ color: "var(--muted-foreground)" }}>
              Sin paralelos — añade una sesión abajo
            </p>
          )}

          {paralelos.map(p => (
            <div key={p.numero} className="flex items-start gap-2 group/par">
              <div className="flex-1 min-w-0">
                <span
                  className="text-[10px] font-medium"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: asignatura.color.text,
                  }}
                >
                  {asignatura.sigla}-{p.numero}
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {p.sesiones.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: asignatura.color.bg,
                        border: `1px solid ${asignatura.color.border}50`,
                        color: asignatura.color.text,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {s.online ? (
                        <>
                          <Wifi size={7} /> ONLINE
                        </>
                      ) : (
                        `${DIAS_SHORT[s.dia]} ${CLAVES[s.clave]}`
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onRemoveParalelo(asignatura.sigla, p.numero)}
                className="opacity-0 group-hover/par:opacity-100 transition-opacity mt-0.5 p-0.5 rounded cursor-pointer"
                style={{ color: "var(--muted-foreground)" }}
                title="Eliminar paralelo"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded text-[10px] transition-opacity hover:opacity-70 mt-1 cursor-pointer"
              style={{ border: "1px dashed var(--border)", color: "var(--muted-foreground)" }}
            >
              <Plus size={9} /> Añadir sesión
            </button>
          ) : (
            <AddSesionForm
              paralelos={asignatura.paralelos}
              onAdd={(numero, sesion) => onAddSesion(asignatura.sigla, numero, sesion)}
              onClose={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
