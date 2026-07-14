/* ────────────────────────────────────────────────────────────────────────────
 *  ScheduleGrid.tsx — Render de la grilla (espejo de Tabla.cpp).
 *  En la vista previa una celda puede tener varios paralelos superpuestos: se
 *  marca en rojo como conflicto. En una solución resuelta eso es imposible por
 *  construcción (la restricción dura lo impide).
 * ──────────────────────────────────────────────────────────────────────────── */

import { Wifi } from "lucide-react"
import { CLAVES, ColorToken, DIAS_SHORT, NUM_CLAVES, NUM_DIAS, etiqueta } from "../lib/domain"
import { EleccionParalelo } from "../lib/solver"

interface CellData {
  sigla: string
  numero: number
  color: ColorToken
}

interface OnlineChip extends CellData {
  veces: number // un paralelo puede tener VARIAS sesiones online
}

export function buildGrid(elecciones: EleccionParalelo[]): CellData[][][] {
  const g: CellData[][][] = Array.from({ length: NUM_DIAS }, () =>
    Array.from({ length: NUM_CLAVES }, () => [] as CellData[]),
  )
  for (const e of elecciones) {
    for (const s of e.sesiones) {
      if (!s.online) {
        g[s.dia][s.clave].push({ sigla: e.sigla, numero: e.numero, color: e.color })
      }
    }
  }
  return g
}

export function buildOnline(elecciones: EleccionParalelo[]): OnlineChip[] {
  const chips: OnlineChip[] = []
  for (const e of elecciones) {
    const veces = e.sesiones.filter(s => s.online).length
    if (veces > 0) {
      chips.push({ sigla: e.sigla, numero: e.numero, color: e.color, veces })
    }
  }
  return chips
}

export function ScheduleGrid({
  grid,
  online,
}: {
  grid: CellData[][][]
  online: OnlineChip[]
}) {
  return (
    <div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table
          className="w-full border-collapse"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="w-14 px-3 py-2.5 text-right text-[9px] text-muted-foreground font-normal tracking-widest uppercase">
                clave
              </th>
              {DIAS_SHORT.map((d, i) => (
                <th
                  key={i}
                  className="px-2 py-2.5 text-center text-[9px] text-muted-foreground font-normal tracking-widest uppercase"
                  style={{ borderLeft: "1px solid var(--border)" }}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLAVES.map((clave, ci) => (
              <tr
                key={ci}
                style={{ borderBottom: ci < NUM_CLAVES - 1 ? "1px solid var(--border)" : "none" }}
              >
                <td className="px-3 py-1.5 text-right text-[9px] text-muted-foreground align-middle whitespace-nowrap">
                  {clave}
                </td>
                {Array.from({ length: NUM_DIAS }, (_, di) => {
                  const cells = grid[di][ci]
                  const conflicto = cells.length > 1
                  return (
                    <td
                      key={di}
                      className="px-1 py-1 align-middle h-10"
                      style={{ borderLeft: "1px solid var(--border)" }}
                    >
                      {cells.length === 0 ? (
                        <div
                          className="h-8 rounded"
                          style={{ border: "1px dashed rgba(75,120,200,0.08)" }}
                        />
                      ) : (
                        <div
                          className="h-8 rounded flex flex-col items-center justify-center gap-[1px] overflow-hidden px-1"
                          style={{
                            background: conflicto ? "rgba(239,68,68,0.14)" : cells[0].color.bg,
                            border: `1px solid ${conflicto ? "#ef4444" : cells[0].color.border}`,
                          }}
                          title={
                            conflicto
                              ? `Choque: ${cells.map(c => etiqueta(c.sigla, c.numero)).join(", ")}`
                              : etiqueta(cells[0].sigla, cells[0].numero)
                          }
                        >
                          {cells.map((c, i) => (
                            <span
                              key={i}
                              className="text-[9px] leading-none font-medium"
                              style={{ color: conflicto ? "#fca5a5" : c.color.text }}
                            >
                              {etiqueta(c.sigla, c.numero)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {online.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Wifi size={10} /> Online
          </span>
          {online.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border"
              style={{ background: c.color.bg, color: c.color.text, borderColor: c.color.border }}
            >
              {etiqueta(c.sigla, c.numero)}
              {c.veces > 1 && ` ×${c.veces}`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
