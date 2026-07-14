/* ────────────────────────────────────────────────────────────────────────────
 *  solver.ts — CSP por fuerza bruta (espejo de Solver.* / Solucion.*)
 *
 *  Variables  = asignaturas
 *  Dominio    = sus paralelos
 *  Asignación = exactamente un paralelo por asignatura
 *  Restricción dura = dos paralelos elegidos no comparten celda (día, clave)
 *
 *  La única poda es la restricción dura. La optimización SOLO ordena, nunca
 *  filtra. Política "todo o nada": no se devuelven horarios parciales.
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  Asignatura,
  ColorToken,
  NUM_CLAVES,
  NUM_DIAS,
  Paralelo,
  Sesion,
  etiqueta,
  mascaraDe,
} from "./domain"

/* ── Elección de un paralelo concreto ── */
export interface EleccionParalelo {
  sigla: string
  numero: number
  sesiones: Sesion[]
  color: ColorToken
}

/* ── Una solución válida del CSP ── */
export interface Solucion {
  elecciones: EleccionParalelo[]
  mascaraCombinada: bigint

  // Criterio 1: VENTANAS (se minimiza).
  scoreVentanas: number

  // Criterio 2: HORARIO (se minimiza). Se guarda como fracción suma/cantidad:
  // el criterio real es el PROMEDIO de clave, no la suma cruda. Con la suma,
  // un paralelo de UNA sesión tardía (clave 5 ⇒ 5) le ganaba a otro con dos
  // sesiones en 1-2 y 13-14 (0+6 ⇒ 6): premiaba "tener menos clases" en vez de
  // "tenerlas temprano". Con promedio (5.00 vs 3.00) gana el correcto.
  sumaClaves: number
  sesionesPresenciales: number
  promedioClave: number // derivado, SOLO para mostrar (ver compararHorario)

  // Firma canónica "ICI4150-2|ICI4247-1": desempate estable, independiente del
  // orden en que el backtracking haya enumerado las soluciones.
  firma: string
}

export interface ResultadoSolver {
  soluciones: Solucion[]
  excluidas: string[] // asignaturas sin paralelos: se omiten con aviso
  truncado: boolean // se alcanzó MAX_SOLUCIONES (guarda del navegador)
}

// Guarda de seguridad: el producto cartesiano crece exponencialmente y el
// navegador no tiene la memoria de una consola. 8 ramos × 8 paralelos serían
// 16 millones de combinaciones. Se corta la enumeración y se avisa.
export const MAX_SOLUCIONES = 50_000

/* ── Score VENTANAS ──────────────────────────────────────────────────────────
 * Por día: la corrida vacía MÁS LARGA que tiene clase antes y después.
 * Se suma esa ventana máxima de los 5 días.                                  */
export function calcularVentanas(elecciones: EleccionParalelo[]): number {
  const ocupado: boolean[][] = Array.from({ length: NUM_DIAS }, () =>
    Array.from({ length: NUM_CLAVES }, () => false),
  )
  for (const e of elecciones) {
    for (const s of e.sesiones) {
      if (!s.online) ocupado[s.dia][s.clave] = true
    }
  }

  let total = 0
  for (let d = 0; d < NUM_DIAS; d++) {
    let previa = -1 // última clave ocupada vista
    let maxVentana = 0
    for (let c = 0; c < NUM_CLAVES; c++) {
      if (ocupado[d][c]) {
        if (previa !== -1) {
          const hueco = c - previa - 1 // vacías entre dos clases
          if (hueco > maxVentana) maxVentana = hueco
        }
        previa = c
      }
    }
    total += maxVentana
  }
  return total
}

/* ── Score HORARIO ──────────────────────────────────────────────────────────
 * Suma y cantidad de claves presenciales. El criterio es el promedio.
 * Las sesiones online no cuentan.                                            */
export function calcularHorario(elecciones: EleccionParalelo[]): {
  suma: number
  cantidad: number
} {
  let suma = 0
  let cantidad = 0
  for (const e of elecciones) {
    for (const s of e.sesiones) {
      if (!s.online) {
        suma += s.clave
        cantidad++
      }
    }
  }
  return { suma, cantidad }
}

/* ── Comparación EXACTA de promedios (sin flotantes) ─────────────────────────
 * sumaA/nA vs sumaB/nB  ⟺  sumaA*nB vs sumaB*nA. Sin división, sin epsilons.
 * Retorna <0 si a es mejor (más temprano), 0 si empatan, >0 si b es mejor.    */
export function compararHorario(a: Solucion, b: Solucion): number {
  const aVacia = a.sesionesPresenciales === 0
  const bVacia = b.sesionesPresenciales === 0
  if (aVacia && bVacia) return 0
  if (aVacia) return b.sumaClaves > 0 ? -1 : 0
  if (bVacia) return a.sumaClaves > 0 ? 1 : 0

  const izquierda = a.sumaClaves * b.sesionesPresenciales
  const derecha = b.sumaClaves * a.sesionesPresenciales
  return izquierda === derecha ? 0 : izquierda < derecha ? -1 : 1
}

/* ── Órdenes totales y deterministas ─────────────────────────────────────────
 * Cada criterio desempata por el OTRO criterio y, si aún hay empate, por la
 * firma canónica. Así el "mejor" ya no depende del orden de enumeración.      */
export function mejorPorVentanas(a: Solucion, b: Solucion): number {
  if (a.scoreVentanas !== b.scoreVentanas) return a.scoreVentanas - b.scoreVentanas
  const c = compararHorario(a, b)
  if (c !== 0) return c
  return a.firma < b.firma ? -1 : a.firma > b.firma ? 1 : 0
}

export function mejorPorHorario(a: Solucion, b: Solucion): number {
  const c = compararHorario(a, b)
  if (c !== 0) return c
  if (a.scoreVentanas !== b.scoreVentanas) return a.scoreVentanas - b.scoreVentanas
  return a.firma < b.firma ? -1 : a.firma > b.firma ? 1 : 0
}

/* ── Dominancia de Pareto ── */
// a domina a b ⟺ a es ≤ en ambos criterios y < en al menos uno.
export function domina(a: Solucion, b: Solucion): boolean {
  const cmpHorario = compararHorario(a, b)
  const noPeor = a.scoreVentanas <= b.scoreVentanas && cmpHorario <= 0
  const mejorEnAlgo = a.scoreVentanas < b.scoreVentanas || cmpHorario < 0
  return noPeor && mejorEnAlgo
}

/* ── Frente de Pareto por barrido (skyline) ──────────────────────────────────
 * Soluciones NO dominadas: en ellas no se puede mejorar un criterio sin
 * empeorar el otro. Ordenando por (ventanas ↑, horario ↑), una solución es no
 * dominada si y solo si mejora ESTRICTAMENTE el mejor horario visto hasta el
 * momento. O(n log n) en vez de comparar todas contra todas, O(n²).
 * Deliberadamente NO se combinan los criterios en un score ponderado: eso
 * obligaría a inventar un "tipo de cambio" arbitrario entre horas muertas y
 * clases temprano.                                                            */
export function frentePareto(soluciones: Solucion[]): Solucion[] {
  const orden = [...soluciones].sort(mejorPorVentanas)
  const frente: Solucion[] = []
  for (const s of orden) {
    if (frente.length === 0 || compararHorario(s, frente[frente.length - 1]) < 0) {
      frente.push(s)
    }
  }
  return frente
}

/* ── Firma canónica ── */
function firmaDe(elecciones: EleccionParalelo[]): string {
  return elecciones.map(e => etiqueta(e.sigla, e.numero)).join("|")
}

/* ── Backtracking / DFS ─────────────────────────────────────────────────────*/
interface Variable {
  sigla: string
  color: ColorToken
  dominio: Paralelo[]
}

export function resolver(asignaturas: Record<string, Asignatura>): ResultadoSolver {
  const excluidas: string[] = []
  const variables: Variable[] = []

  // Orden lexicográfico por sigla: equivalente al std::map del Registro en C++.
  // Hace que la firma canónica y la enumeración sean reproducibles.
  const siglas = Object.keys(asignaturas).sort((a, b) => a.localeCompare(b))

  for (const sigla of siglas) {
    const asignatura = asignaturas[sigla]
    const paralelos = Object.values(asignatura.paralelos).sort((a, b) => a.numero - b.numero)
    if (paralelos.length === 0) {
      excluidas.push(sigla) // sin paralelos ⇒ se excluye con aviso
      continue
    }
    variables.push({ sigla, color: asignatura.color, dominio: paralelos })
  }

  const soluciones: Solucion[] = []
  let truncado = false
  if (variables.length === 0) return { soluciones, excluidas, truncado }

  // Máscara cacheada por paralelo: se calcula una sola vez, no en cada nodo.
  const mascaras = variables.map(v => v.dominio.map(p => mascaraDe(p.sesiones)))

  const parcial: EleccionParalelo[] = []

  const backtrack = (indice: number, mascaraAcum: bigint): void => {
    if (truncado) return

    // "Todo o nada": solo se registra al asignar TODAS las variables.
    if (indice === variables.length) {
      if (soluciones.length >= MAX_SOLUCIONES) {
        truncado = true
        return
      }
      const elecciones = parcial.map(e => ({ ...e }))
      const { suma, cantidad } = calcularHorario(elecciones)
      soluciones.push({
        elecciones,
        mascaraCombinada: mascaraAcum,
        scoreVentanas: calcularVentanas(elecciones),
        sumaClaves: suma,
        sesionesPresenciales: cantidad,
        promedioClave: cantidad === 0 ? 0 : suma / cantidad,
        firma: firmaDe(elecciones),
      })
      return
    }

    const variable = variables[indice]
    for (let j = 0; j < variable.dominio.length; j++) {
      const mascara = mascaras[indice][j]
      // Poda dura: si comparte alguna celda con lo acumulado, jamás será válido.
      if ((mascaraAcum & mascara) !== 0n) continue

      const paralelo = variable.dominio[j]
      parcial.push({
        sigla: variable.sigla,
        numero: paralelo.numero,
        sesiones: paralelo.sesiones,
        color: variable.color,
      })
      backtrack(indice + 1, mascaraAcum | mascara)
      parcial.pop()

      if (truncado) return
    }
  }

  backtrack(0, 0n)
  return { soluciones, excluidas, truncado }
}
