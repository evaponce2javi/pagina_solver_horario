# Prompt para Claude Opus 4.8 — Solver de horario universitario (CSP en C++)

---

## Rol y contexto

Eres un ingeniero de software senior experto en C++ moderno (C++17), estructuras de datos y problemas de satisfacción de restricciones (CSP). Vas a implementar un programa de consola **modular, multi-archivo, compilable y listo para subir a GitHub y ejecutar en VS Code**. El programa resuelve, por fuerza bruta completa, el armado de un horario universitario como un CSP, y ordena las soluciones según dos criterios de optimización independientes.

No inventes requisitos ni "mejores" que no estén aquí. Si algo es ambiguo, aplica la regla explícita que te doy en la sección **Decisiones fijas**. Entrega el código completo de todos los archivos, sin fragmentos incompletos ni `// ...`.

## Modelo del dominio

- **Días** (índice 0–4): `LUNES(0), MARTES(1), MIÉRCOLES(2), JUEVES(3), VIERNES(4)`.
- **Claves horarias con horario** (índice 0–6): `1-2(0), 3-4(1), 5-6(2), 7-8(3), 9-10(4), 11-12(5), 13-14(6)`.
- **Clave especial** `ONLINE`: no ocupa ninguna celda del grid y jamás produce choque.
- **Grid**: 7 claves × 5 días = 35 celdas.

Entidades:
- **Asignatura**: identificada por una sigla de exactamente 3 letras + 4 dígitos (ej. `ICI4247`). Contiene sus paralelos.
- **Paralelo**: identificado por un número entero, pertenece a una asignatura. **Puede tener varias sesiones** (varias combinaciones día/clave). Ej.: `ICI4247-2` puede estar en LUNES 1-2 y en MIÉRCOLES 1-2 a la vez.
- **Sesión**: una celda concreta `(día, clave)`, o bien una marca `online`.

## Estructuras de datos obligatorias

Usa exactamente este diseño (justificado por comportamiento de los datos):

- **Registro** de asignaturas: `std::map<std::string, Asignatura>` con clave = sigla. Da orden lexicográfico gratuito para los listados (todos los menús muestran las asignaturas ordenadas) y búsqueda por sigla en O(log n).
- **Paralelos** de una asignatura: `std::map<int, Paralelo>` con clave = número de paralelo. Orden ascendente gratuito y unicidad del número garantizada por el contenedor.
- **Sesiones** de un paralelo: `std::vector<Sesion>`.
- `struct Sesion { int dia; int clave; bool online; };` con `dia ∈ [0,4]`, `clave ∈ [0,6]`. Si `online == true`, `dia` y `clave` se ignoran.
- **Máscara de ocupación por paralelo**: `uint64_t mascara`, cacheada. Cada sesión con horario prende el bit `dia * 7 + clave`. Las sesiones online no prenden bits. Detección de choque entre dos paralelos = `(a.mascara & b.mascara) != 0`.
- **Solución**: `struct Solucion` que guarda la elección (lista de `(sigla, numeroParalelo)` junto con sus sesiones, suficiente para dibujar la tabla), la máscara combinada, y los puntajes cacheados `scoreVentanas` y `scoreHorario`.
- **Todas las soluciones**: `std::vector<Solucion>`.
- Etiquetas de días y claves: `std::array<std::string,5>` y `std::array<std::string,7>` (constantes) para parseo y despliegue.

## Arquitectura de archivos

Organiza el proyecto de forma modular. Estructura sugerida (headers con include guards o `#pragma once`):

- `main.cpp` — punto de entrada; loop del menú.
- `Sesion.h` — struct `Sesion` y constantes de días/claves.
- `Paralelo.h` / `Paralelo.cpp` — struct/clase Paralelo + cálculo de máscara.
- `Asignatura.h` / `Asignatura.cpp` — Asignatura con su `std::map<int, Paralelo>`.
- `Registro.h` / `Registro.cpp` — el `std::map<std::string, Asignatura>` y todas las operaciones CRUD.
- `Solver.h` / `Solver.cpp` — backtracking del CSP + cálculo de los dos scores.
- `Solucion.h` / `Solucion.cpp` — struct Solucion.
- `Tabla.h` / `Tabla.cpp` — render de la tabla de horario en terminal.
- `Utilidades.h` / `Utilidades.cpp` — `limpiarPantalla`, `presioneTeclaParaContinuar`, validaciones de input, conversión a mayúsculas, parseo de día y de clave.
- `Menu.h` / `Menu.cpp` — despliegue y despacho del menú.
- `Makefile` **o** `CMakeLists.txt` para compilar con un solo comando, y un `README.md` breve con instrucciones de compilación/ejecución en VS Code.

## Menú principal

```
1. Añadir asignatura
2. Eliminar asignatura
3. Añadir paralelo
4. Eliminar paralelo
5. Resolver horario
6. Mostrar resultados
0. Salir
```

Tras completar cualquier acción y antes de volver al menú, llama a `presioneTeclaParaContinuar()` y luego a `limpiarPantalla()`.

### Opción 1 — Añadir asignatura
Pide la sigla. Conviértela a mayúsculas automáticamente. Válida contra el patrón exacto `^[A-Z]{3}[0-9]{4}$` (3 letras + 4 dígitos, **sin** guion ni número de paralelo). Si falla, muestra el error y vuelve a preguntar en bucle hasta recibir una sigla válida. Si ya existe, avisa. Ejemplo de interacción:

```
Ingrese la sigla de la asignatura (Ejemplo: ICI4247)
> ici4247-5
Error: Utilice el formato adecuado (Ejemplo: ICI4247)
> ici4247
Asignatura guardada con éxito.
```

### Opción 2 — Eliminar asignatura
Lista todas las asignaturas con su conteo de paralelos. Pide la sigla a eliminar (mayúsculas). Si no existe, muestra el error y ofrece un submenú `1. Eliminar asignatura / 2. Volver al menú`. Al eliminar, borra la asignatura **con todos sus paralelos** e informa cuántos se eliminaron.

```
Asignaturas disponibles para eliminar:
- ICA4161 (con 3 paralelos)
- ICI5345 (con 4 paralelos)
...
> ICI6556
Error: La asignatura no existe en el registro. Ingrese una opción:
1. Eliminar asignatura
2. Volver al menú
> 1
Ingrese sigla de asignatura a eliminar:
> ica4161
ICA4161 eliminado con éxito junto con sus 3 paralelos.
```

### Opción 3 — Añadir paralelo
Lista las asignaturas disponibles. Pide la sigla; si no existe, error y volver al menú. Luego:
1. Pide el **número de paralelo** y verifica que sea un entero válido (rechaza `ICA4161-1`, `abc`, etc.). Si el número ya existe como paralelo, la nueva sesión se agrega a ese mismo paralelo (paralelo multi-sesión); si no existe, se crea.
2. Pide el **día**: acepta los 5 nombres válidos, case-insensitive, tolerando `MIERCOLES` y `MIÉRCOLES`. Input inválido → error y re-preguntar. (Si el usuario indica que la sesión es `ONLINE`, salta la pregunta de día.)
3. Pide la **clave** en formato `n-m`; debe ser una de las 7 claves válidas o el token `ONLINE`. Inválida → error y re-preguntar.
4. **Verifica que esa sesión no exista ya** para ese paralelo, usando la clave de unicidad `(sigla, número, día, clave)`. Si ya existe, avisa y no dupliques.
5. Muestra un resumen y ofrece `1. Deshacer datos / 2. Confirmar datos`. Solo acepta `1` o `2` (rechaza `confirmar`). Al confirmar, guarda; al deshacer, descarta.

```
> ICI5476
Ingrese el número de paralelo (ejemplo: 1):
> 1
Ingrese el día (ejemplo: VIERNES):
> LUNE
Error: Ingrese un día válido.
> lunes
Ingrese la clave horaria (ejemplo: 1-2):
> 7-8

ICI5476-1 LUNES CLAVE 7-8
1. Deshacer datos
2. Confirmar datos
Escoja una opción (ejemplo: 2)
> confirmar
Error: Escoja una opción válida.
> 2
Paralelo asignado con éxito: ICI5476-1
```

### Opción 4 — Eliminar paralelo
Lista asignaturas. Pide la sigla (si no existe, error). Lista los paralelos de esa asignatura con su día/clave. Pide el **número** del paralelo a eliminar y valida que sea entero y que exista (rechaza `ICA4161-1`, números inexistentes). Elimina el paralelo completo.

```
> ICA4161
Paralelos disponibles:
- ICA4161-1 MARTES 1-2
- ICA4161-2 MARTES 3-4
- ICA4161-3 VIERNES 11-12
Ingrese el número del paralelo a eliminar (ejemplo: 2)
> ICA4161-1
Error: Ingrese un número válido.
> 4
Error: Ingrese un número válido.
> 2
Paralelo 2 eliminado con éxito.
```

### Opción 5 — Resolver horario (CSP por fuerza bruta)
Modela el problema así:
- **Variables**: las asignaturas. **Dominio** de cada una: sus paralelos. **Asignación**: exactamente un paralelo por asignatura.
- **Restricción dura**: dos paralelos elegidos no pueden compartir ninguna celda `(día, clave)` con horario. Esto se comprueba con AND de máscaras.

Algoritmo: **backtracking recursivo (DFS)** sobre las asignaturas. En cada nivel prueba cada paralelo de la asignatura actual; si su máscara solapa con la máscara acumulada, **poda** (esa rama ya viola la restricción dura, jamás dará solución válida); si no solapa, acumula por OR y recurre; en la hoja registra la solución.

**Requisito de completitud (crítico):** debe guardar **TODAS** las combinaciones que cumplan la restricción. La única poda permitida es por violación de la restricción dura. No apliques heurísticas de optimización que descarten soluciones válidas: la optimización solo ordena, nunca filtra.

Al terminar, informa cuántas soluciones se encontraron. Si no hay ninguna, deja el estado para que la opción 6 muestre "No hay solución posible que cumpla con las restricciones".

### Opción 6 — Mostrar resultados
Muestra primero los dos ganadores y luego todas las soluciones:

```
Se han encontrado un total de 19 soluciones:

(1) M E J O R   S O L U C I Ó N   V E N T A N A S:
(tabla de horario)

(2) M E J O R   S O L U C I Ó N   H O R A R I O:
(tabla de horario)

Soluciones que cumplen restricciones:

( 1 )
(tabla de horario)
...
```

Cada horario se dibuja como una tabla de terminal con 7 filas (claves) × 5 columnas (días), celdas con `SIGLA-numero` o `X`. Formato de referencia:

```
+-----------------------------------------------------------------------+
|LUNES      | MARTES    | MIÉRCOLES  | JUEVES     | VIERNES    |
|-----------------------------------------------------------------------|
| ICI4247-2 |    X      | ICI4247-2  |    X       |    X       |
| ...
+-----------------------------------------------------------------------+
```

Si no hay soluciones, imprime solo: `No hay solución posible que cumpla con las restricciones`.

## Funciones de optimización (definiciones exactas)

Se evalúan **por separado**; cada una produce su propia mejor solución. Ambas se minimizan.

1. **Ventanas.** Una ventana en un día es la corrida más larga de claves vacías que tenga clase antes y clase después dentro de ese día. Por día se considera **solo esa ventana máxima** (no la suma de huecos del día). El puntaje de ventanas de una solución es la **suma de las ventanas máximas de los 5 días**. Ejemplo: LUNES con clase en 1-2 (clave 0) y en 11-12 (clave 5) → claves 1,2,3,4 vacías → ventana 4.
2. **Horario.** Suma de los índices de clave (0–6) sobre todas las sesiones **con horario** de la solución. Menor suma = clases más de mañana = mejor. Las sesiones online no suman.

Las dos mejores se obtienen con `std::min_element` usando un comparador por cada score; no reordenes el vector de soluciones para esto.

## Utilidades y portabilidad

- `void limpiarPantalla();` — portable: usa `#ifdef _WIN32` con `system("cls")` y `system("clear")` en el resto, o secuencias ANSI `\033[2J\033[H`.
- `void presioneTeclaParaContinuar();` — imprime `Presione enter para continuar...` y espera un enter. Llámala tras cada acción, antes de `limpiarPantalla()` y de volver al menú.
- Validaciones robustas de entero (consumir toda la línea; rechazar `"4x"`, `"ICA-1"`), de sigla, de día y de clave.

**Advertencia UTF-8:** `MIÉRCOLES` contiene una tilde; en UTF-8 la `É` ocupa 2 bytes, así que `std::setw` cuenta bytes y descuadra la tabla. Calcula el ancho de columna compensando manualmente los caracteres multibyte (o define un ancho fijo por columna y rellena con espacios según el número real de caracteres visibles), de modo que la tabla quede alineada.

## Reglas de estilo de código

- Nomenclatura en español con `camelCase` (ej. `numeroParalelo`, `agregarSesion`, `calcularVentanas`).
- Comentarios de sección con banners usando el carácter `⫘` para separar bloques lógicos dentro de los archivos.
- Código modular, funciones cortas y con una sola responsabilidad.
- Salida por consola concisa y escaneable.
- Sin números mágicos: constantes con nombre para 7 claves, 5 días, 35 celdas.

## Decisiones fijas (resolución de ambigüedades)

Aplica estas reglas sin desviarte:
1. Unicidad de sesión = `(sigla, número, día, clave)`. Un mismo paralelo puede repetir clave en días distintos.
2. Ventanas = suma sobre los días de la ventana máxima de cada día.
3. Horario = suma de índices de clave de las sesiones con horario; online no cuenta.
4. Sesiones `ONLINE`: no ocupan grid, nunca chocan, no afectan puntajes.
5. Al resolver, una asignatura con 0 paralelos se **excluye** del producto con un aviso; si no queda ninguna asignatura resoluble, no hay solución.

## Entregable esperado

Entrega el **código completo de todos los archivos** (headers y fuentes), el `Makefile`/`CMakeLists.txt` y un `README.md` con instrucciones de compilación y ejecución. El programa debe compilar sin warnings con `-std=c++17 -Wall -Wextra` y ejecutarse en Linux/macOS/Windows.