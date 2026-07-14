# Solver de Horario Universitario — Frontend (React + Vite + TypeScript)

Puerto fiel a la web del programa de consola en C++17. Modela el armado de
horario como un **problema de satisfacción de restricciones (CSP)**, lo resuelve
por **fuerza bruta completa** (backtracking con poda por restricción dura) y
ordena las soluciones según dos criterios de optimización independientes.

> **Sin persistencia, por diseño**: no usa `localStorage` ni backend. Al
> refrescar la página se reinicia todo.

## Ejecutar

```bash
npm i
npm run dev      # http://localhost:5173
```

Otros scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

## Modelo

- **Variables**: las asignaturas. **Dominio**: sus paralelos.
- **Asignación**: exactamente un paralelo por asignatura.
- **Restricción dura**: dos paralelos elegidos no pueden compartir ninguna celda
  `(día, clave)`. Se comprueba con un AND de máscaras `bigint` (cada sesión
  presencial prende el bit `dia * 7 + clave`; 35 celdas en total). Detectar
  choque es `(a & b) !== 0n`, O(1).
- La única poda es la restricción dura: se guardan **todas** las combinaciones
  válidas. La optimización solo **ordena**, nunca filtra.
- **Todo o nada**: si no existe una asignación completa, no hay solución. No se
  arman horarios parciales.
- `ONLINE` no ocupa celda y jamás choca. Un paralelo puede tener **varias**
  sesiones ONLINE (la unicidad `(día, clave)` solo rige para las presenciales).
- Las asignaturas **sin paralelos** se excluyen de la búsqueda, con aviso.

### Criterios de optimización (ambos se minimizan)

1. **Ventanas** — por día, la corrida vacía más larga que tiene clase antes y
   después; se suma esa ventana máxima de los 5 días.
2. **Horario** — **promedio** de los índices de clave (0 = `1-2` … 6 = `13-14`)
   de las sesiones presenciales. Menor promedio = clases más de mañana. Se usa
   el promedio y no la suma porque la suma premiaba a los paralelos con *menos*
   sesiones en vez de a los que tienen clases *más temprano*. La comparación es
   **exacta con enteros** (multiplicación cruzada `sumaA·nB` vs `sumaB·nA`), sin
   flotantes ni epsilons.

### Desempates y trade-off

- **Orden total determinista**: cada criterio desempata por el *otro* criterio y,
  si aún hay empate, por la **firma canónica** (`ICI4150-2|ICI4247-1`). El
  "mejor" no depende del orden en que el backtracking enumeró.
- **Frente de Pareto**: se listan las soluciones **no dominadas** — aquellas en
  las que no se puede mejorar un criterio sin empeorar el otro. Se calcula por
  barrido (skyline) en O(n log n). Deliberadamente **no** se combinan los
  criterios en un score ponderado: eso obligaría a inventar un "tipo de cambio"
  arbitrario entre horas muertas y clases temprano.

## Estructura

```
src/
  main.tsx                        Punto de entrada
  app/
    App.tsx                       Estado, CRUD, invalidación, layout
    lib/
      domain.ts                   Constantes, entidades, máscara (≈ Sesion.h / Paralelo)
      solver.ts                   CSP, scores, comparadores, Pareto (≈ Solver / Solucion)
    components/
      ScheduleGrid.tsx            Grilla 7×5 + chips ONLINE (≈ Tabla.cpp)
      CourseItem.tsx              Asignatura + paralelos + alta de sesión (≈ menú 1–4)
      ResultsPanel.tsx            Óptimas, Pareto y listado acotado (≈ menú 6)
      ui/                         shadcn/ui (no lo usa la app; queda disponible)
  styles/                         Fuentes, Tailwind v4 y tema
```

## Notas de implementación

- **Invalidación**: cualquier mutación del registro (añadir/eliminar asignatura o
  paralelo, añadir sesión) descarta las soluciones ya calculadas. Sin esto se
  podían mostrar horarios con asignaturas ya eliminadas.
- **Tope de render**: el listado pinta 50 tarjetas por vez ("Mostrar 50 más").
  Los criterios y el Pareto se calculan siempre sobre *todas* las soluciones; el
  tope es solo de presentación.
- **Guarda de seguridad**: la enumeración se corta en 50 000 soluciones
  (`MAX_SOLUCIONES` en `solver.ts`) y se avisa en pantalla. El producto
  cartesiano crece exponencialmente y el navegador no tiene la memoria de una
  consola; el C++ original no necesita este tope.
- **Vista previa**: con todos los paralelos superpuestos, las celdas con más de
  un paralelo se pintan en rojo (choque). En una solución resuelta eso es
  imposible por construcción.
- **Validación**: sigla `^[A-Z]{3}[0-9]{4}$`; número de paralelo entero ≥ 1 (no
  se aceptan negativos ni signo explícito).
