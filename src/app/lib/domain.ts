/* ────────────────────────────────────────────────────────────────────────────
 *  domain.ts — Núcleo del dominio (espejo de Sesion.h / Paralelo.* / Asignatura.*)
 *  Constantes del grid, entidades y la máscara de ocupación.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── Constantes del grid (sin números mágicos) ── */
export const NUM_DIAS = 5
export const NUM_CLAVES = 7
export const NUM_CELDAS = NUM_DIAS * NUM_CLAVES // 35 celdas

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
export const DIAS_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE"]
export const CLAVES = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"]

export const SIGLA_RE = /^[A-Z]{3}[0-9]{4}$/

/* ── Entidades ── */
export interface Sesion {
  dia: number // 0..4   (irrelevante si online)
  clave: number // 0..6   (irrelevante si online)
  online: boolean // true ⇒ no ocupa grid, nunca choca
}

export interface Paralelo {
  numero: number
  sesiones: Sesion[]
}

export interface ColorToken {
  bg: string
  border: string
  text: string
}

export interface Asignatura {
  sigla: string
  paralelos: Record<number, Paralelo>
  color: ColorToken
}

/* ── Máscara de ocupación ── */
// Bit dia*7 + clave. 35 celdas caben de sobra en un bigint; el choque entre dos
// paralelos es un simple AND: (a & b) !== 0n, O(1).
export function indiceBit(dia: number, clave: number): number {
  return dia * NUM_CLAVES + clave
}

export function mascaraDe(sesiones: Sesion[]): bigint {
  let m = 0n
  for (const s of sesiones) {
    if (!s.online) m |= 1n << BigInt(indiceBit(s.dia, s.clave))
  }
  return m
}

/* ── Unicidad de sesión ── */
// Solo las presenciales tienen unicidad (día, clave). Las ONLINE no ocupan grid,
// así que un paralelo puede acumular VARIAS marcas online.
export function existeSesion(paralelo: Paralelo | undefined, sesion: Sesion): boolean {
  if (!paralelo) return false
  if (sesion.online) return false // múltiples marcas online permitidas
  return paralelo.sesiones.some(
    s => !s.online && s.dia === sesion.dia && s.clave === sesion.clave,
  )
}

/* ── Etiqueta legible "SIGLA-numero" ── */
export function etiqueta(sigla: string, numero: number): string {
  return `${sigla}-${numero}`
}

/* ── Paleta de colores por asignatura ── */
export const PALETTE: ColorToken[] = [
  { bg: "rgba(59,130,246,0.18)", border: "#3b82f6", text: "#93c5fd" },
  { bg: "rgba(249,115,22,0.18)", border: "#f97316", text: "#fed7aa" },
  { bg: "rgba(34,197,94,0.18)", border: "#22c55e", text: "#86efac" },
  { bg: "rgba(168,85,247,0.18)", border: "#a855f7", text: "#d8b4fe" },
  { bg: "rgba(236,72,153,0.18)", border: "#ec4899", text: "#fbcfe8" },
  { bg: "rgba(20,184,166,0.18)", border: "#14b8a6", text: "#99f6e4" },
  { bg: "rgba(234,179,8,0.18)", border: "#eab308", text: "#fef08a" },
  { bg: "rgba(239,68,68,0.18)", border: "#ef4444", text: "#fca5a5" },
  { bg: "rgba(6,182,212,0.18)", border: "#06b6d4", text: "#a5f3fc" },
  { bg: "rgba(132,204,22,0.18)", border: "#84cc16", text: "#d9f99d" },
]
