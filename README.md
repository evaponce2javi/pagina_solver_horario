# Solver de Horario Universitario

Modela el armado de horario como un **problema de satisfacción de restricciones (CSP)**, lo resuelve por **fuerza bruta completa** (backtracking con poda por restricción dura) y ordena las soluciones según dos criterios de optimización independientes.

## Ejecutar

Recuerda tener instalado Node.js

En la terminal, escribir:

```bash
npm i
npm run dev     
```

---

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
