# Solver de Horario Universitario

Modela el armado de horario como un **problema de satisfacción de restricciones (CSP)**, lo resuelve por **fuerza bruta completa** (backtracking con poda por restricción dura) y ordena las soluciones según dos criterios de optimización independientes.

## Ejecutar

Primero descargar el repo, hacerle fork o abrirlo con github desktop :D

Recuerda tener instalado Node.js

En la terminal, escribir:

```bash
npm i
npm run dev     
```

---
## Ejemplo

Acá ponen sus asignaturas:
<img width="297" height="377" alt="image" src="https://github.com/user-attachments/assets/2439b9be-62ba-4506-a54f-4b1a2ba7a6c5" />

Pueden añadir paralelos y sesiones: <img width="287" height="327" alt="image" src="https://github.com/user-attachments/assets/efe3d19a-4349-4af9-9c19-f586a38b0e4d" />

En la vista previa irá saliendo a tiempo real cómo se va creando el horario de todos los paralelos: <img width="1603" height="436" alt="image" src="https://github.com/user-attachments/assets/e5f4a47f-54ea-4821-8428-1d8745fc3927" />

Y al hacer clic en "Resolver", se obtienen los resultados sin choque: <img width="352" height="55" alt="image" src="https://github.com/user-attachments/assets/c9c500d5-d460-4420-afb5-9027d72b2623" />

Ejemplo de solución:

<img width="1917" height="860" alt="image" src="https://github.com/user-attachments/assets/5da6db10-d425-4251-b5da-311978deb6e6" />

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

No olviden darle una estrellita :-)
