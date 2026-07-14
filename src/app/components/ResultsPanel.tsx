/* ────────────────────────────────────────────────────────────────────────────
 *  ResultsPanel.tsx — Panel derecho (espejo de la opción 6 del menú):
 *    (1) mejor por ventanas   (2) mejor por horario
 *    (3) frente de Pareto     (4) listado ordenado, acotado a 50 por página
 * ──────────────────────────────────────────────────────────────────────────── */

import { useState } from "react"
import { Award, Clock, Layers, Scale } from "lucide-react"
import { etiqueta } from "../lib/domain"
import { Solucion } from "../lib/solver"

// Tope de tarjetas renderizadas de una vez: con 5 ramos × 4 paralelos hay 1024
// soluciones y pintarlas todas es inservible (y lento). Los criterios y el
// frente de Pareto se calculan SIEMPRE sobre todas; el tope es de presentación.
export const MAX_TARJETAS = 50

function Scores({ sol }: { sol: Solucion }) {
  return (
    <div className="flex gap-2 font-mono text-[9px]" style={{ color: "var(--muted-foreground)" }}>
      <span title="Ventanas (huecos)">V:{sol.scoreVentanas}</span>
      <span title="Horario (promedio de clave)">H:{sol.promedioClave.toFixed(2)}</span>
    </div>
  )
}

function Chips({ sol }: { sol: Solucion }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {sol.elecciones.map(e => (
        <span
          key={e.sigla}
          className="text-[8px] px-1 rounded font-mono"
          style={{
            background: e.color.bg,
            color: e.color.text,
            border: `1px solid ${e.color.border}50`,
          }}
        >
          {etiqueta(e.sigla, e.numero)}
        </span>
      ))}
    </div>
  )
}

function SolutionCard({
  sol,
  index,
  selected,
  isBestV,
  isBestH,
  isPareto,
  onClick,
}: {
  sol: Solucion
  index: number
  selected: boolean
  isBestV: boolean
  isBestH: boolean
  isPareto: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer hover:opacity-90"
      style={{
        background: selected ? "rgba(75,123,236,0.12)" : "transparent",
        border: selected ? "1px solid rgba(75,123,236,0.3)" : "1px solid transparent",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[9px] font-mono w-5 text-right shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        >
          {index + 1}
        </span>
        <div className="flex gap-1">
          {isBestV && (
            <span
              className="text-[8px] px-1 rounded"
              style={{
                background: "rgba(234,179,8,0.15)",
                color: "#fef08a",
                border: "1px solid rgba(234,179,8,0.3)",
              }}
              title="Mejor por ventanas"
            >
              ↓V
            </span>
          )}
          {isBestH && (
            <span
              className="text-[8px] px-1 rounded"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#86efac",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
              title="Mejor por horario"
            >
              ↓H
            </span>
          )}
          {isPareto && !isBestV && !isBestH && (
            <span
              className="text-[8px] px-1 rounded"
              style={{
                background: "rgba(168,85,247,0.12)",
                color: "#d8b4fe",
                border: "1px solid rgba(168,85,247,0.3)",
              }}
              title="No dominada (frente de Pareto)"
            >
              ◆
            </span>
          )}
        </div>
        <div className="ml-auto">
          <Scores sol={sol} />
        </div>
      </div>
      <div className="pl-7">
        <Chips sol={sol} />
      </div>
    </button>
  )
}

export function ResultsPanel({
  orden,
  pareto,
  mejorV,
  mejorH,
  seleccionada,
  onSelect,
}: {
  orden: Solucion[] // ya ordenadas por (ventanas, horario, firma)
  pareto: Solucion[]
  mejorV: Solucion
  mejorH: Solucion
  seleccionada: Solucion | null
  onSelect: (sol: Solucion) => void
}) {
  const [visibles, setVisibles] = useState(MAX_TARJETAS)
  const firmasPareto = new Set(pareto.map(s => s.firma))
  const restantes = orden.length - visibles

  return (
    <aside
      className="w-72 shrink-0 flex flex-col overflow-hidden"
      style={{ borderLeft: "1px solid var(--border)" }}
    >
      <div
        className="px-4 py-2.5 shrink-0 flex items-center gap-1.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Layers size={11} style={{ color: "var(--muted-foreground)" }} />
        <span className="text-xs font-medium">Resultados</span>
        <span
          className="ml-auto text-[9px] font-mono"
          style={{ color: "var(--muted-foreground)" }}
        >
          {orden.length}
        </span>
      </div>

      {/* ── (1) y (2): los dos óptimos ── */}
      <div className="px-3 py-2.5 space-y-1 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <p
          className="text-[9px] uppercase tracking-widest mb-2"
          style={{ color: "var(--muted-foreground)" }}
        >
          Óptimas
        </p>

        <button
          onClick={() => onSelect(mejorV)}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] transition-colors cursor-pointer hover:opacity-80"
          style={{
            background: seleccionada?.firma === mejorV.firma ? "rgba(234,179,8,0.1)" : "transparent",
            border:
              seleccionada?.firma === mejorV.firma
                ? "1px solid rgba(234,179,8,0.3)"
                : "1px solid transparent",
          }}
        >
          <Award size={10} style={{ color: "#fef08a" }} />
          <span style={{ color: "var(--muted-foreground)" }}>Menos ventanas</span>
          <span className="ml-auto font-mono" style={{ color: "#fef08a" }}>
            {mejorV.scoreVentanas}
          </span>
        </button>

        <button
          onClick={() => onSelect(mejorH)}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] transition-colors cursor-pointer hover:opacity-80"
          style={{
            background: seleccionada?.firma === mejorH.firma ? "rgba(34,197,94,0.1)" : "transparent",
            border:
              seleccionada?.firma === mejorH.firma
                ? "1px solid rgba(34,197,94,0.25)"
                : "1px solid transparent",
          }}
        >
          <Clock size={10} style={{ color: "#86efac" }} />
          <span style={{ color: "var(--muted-foreground)" }}>Más temprano</span>
          <span className="ml-auto font-mono" style={{ color: "#86efac" }}>
            {mejorH.promedioClave.toFixed(2)}
          </span>
        </button>
      </div>

      {/* ── (3) Frente de Pareto ── */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <p
          className="text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Scale size={9} /> Frente de Pareto · {pareto.length}
        </p>
        <p className="text-[9px] leading-snug mb-2" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
          No se puede mejorar un criterio sin empeorar el otro. Todo lo demás está dominado.
        </p>
        <div className="space-y-0.5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {pareto.map(sol => (
            <button
              key={sol.firma}
              onClick={() => onSelect(sol)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors cursor-pointer hover:opacity-80"
              style={{
                background: seleccionada?.firma === sol.firma ? "rgba(168,85,247,0.12)" : "transparent",
                border:
                  seleccionada?.firma === sol.firma
                    ? "1px solid rgba(168,85,247,0.3)"
                    : "1px solid transparent",
              }}
            >
              <Scores sol={sol} />
              <span className="ml-auto min-w-0">
                <Chips sol={sol} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── (4) Listado completo, ordenado y acotado ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        <p
          className="text-[9px] uppercase tracking-widest px-1 mb-1.5 pt-0.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          Todas · orden: ventanas → horario
        </p>

        {orden.slice(0, visibles).map((sol, i) => (
          <SolutionCard
            key={sol.firma}
            sol={sol}
            index={i}
            selected={seleccionada?.firma === sol.firma}
            isBestV={sol.firma === mejorV.firma}
            isBestH={sol.firma === mejorH.firma}
            isPareto={firmasPareto.has(sol.firma)}
            onClick={() => onSelect(sol)}
          />
        ))}

        {restantes > 0 && (
          <button
            onClick={() => setVisibles(v => v + MAX_TARJETAS)}
            className="w-full py-2 mt-1 rounded text-[10px] transition-opacity hover:opacity-70 cursor-pointer"
            style={{ border: "1px dashed var(--border)", color: "var(--muted-foreground)" }}
          >
            Mostrar {Math.min(restantes, MAX_TARJETAS)} más · quedan {restantes}
          </button>
        )}
      </div>
    </aside>
  )
}
