# Sistema de Gestión de Presentismo — Node.js

Migración del sistema de auditoría de presentismo de PHP a Node.js. API REST con arquitectura hexagonal que procesa reportes de ausencias y sueldos, calcula el premio presentismo por empleado y detecta errores de liquidación automáticamente.

---

## ¿Qué problema resuelve?

Cada mes, el área de RRHH liquida el premio presentismo del personal. Este sistema permite verificar que los montos pagados sean correctos, cruzando dos fuentes de datos:

- **Reporte de ausencias** (CSV exportado desde el sistema de RRHH)
- **Reporte de sueldos** (CSV o Excel con los montos liquidados)

El resultado muestra, por cada empleado, si el monto pagado coincide con el calculado por el sistema, señalando los casos que requieren revisión.

---

## Funcionalidades

- Carga de archivos CSV de ausencias y CSV/Excel de sueldos
- Cálculo automático del porcentaje de presentismo (100%, 70%, 40% o 0%)
- Detección de corte total por ausencia injustificada
- Soporte de reglas simples y reglas especiales configurables:
  - **13A** – Licencia por examen (tope según nivel educativo)
  - **10J** – Enfermedad familiar (tope según condición: discapacidad, edad, vínculo)
- Cálculo de histórico de ausencias en el período de presentismo
- Manejo de ausencias que cruzan períodos (solapamiento de fechas)
- Comparación automática entre monto esperado y monto liquidado
- Detalle por empleado con desglose de ausencias y días descontables
- Detección de alertas: Función Ejecutiva (FE) y Cargo de Mayor Jerarquía (CMJ)
- ABM de reglas de ausencias desde la interfaz
- Configuración del valor base del presentismo
- Autenticación con login y sesiones

---

## Configuración de reglas

Las reglas de ausencias son completamente configurables desde la interfaz, sin necesidad de modificar el código.

**Reglas simples** — cada tipo de ausencia tiene:
- Código y nombre
- Tope de días
- Si descuenta o no del presentismo
- Si genera corte total (0%)
- Si está activa

**Reglas especiales** — para ausencias como 10J o 13A, el tope varía según condiciones del empleado. Cada condición se configura con:
- Prioridad de evaluación
- Campo a evaluar (discapacidad, edad, vínculo, nivel educativo)
- Operador (es, mayor o igual, menor o igual, contiene)
- Valor de comparación
- Tope a aplicar si se cumple la condición

Esto permite adaptar el sistema a cambios en la normativa sin tocar el código.

---

## Lógica de cálculo

El sistema calcula los días descontables usando la fórmula:

```
descontables = max(0, (histórico + período) - tope)
```

Donde:
- **histórico**: días de ausencia acumulados en los meses anteriores al período de liquidación
- **período**: días de ausencia en el mes de liquidación
- **tope**: límite configurado según el tipo y condición de la ausencia

El porcentaje final se determina así:

| Días descontables | Presentismo |
|-------------------|-------------|
| 0 | 100% |
| 1 | 70% |
| 2 | 40% |
| 3 o más | 0% |
| Ausencia injustificada | 0% (corte total) |

---

## Tecnologías

- Node.js
- Express
- SQLite (autenticación + configuración de reglas)
- Bootstrap 5 + DataTables
- Arquitectura hexagonal (domain, application, infrastructure, interfaces)

---

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/rodriguezacostamj-lab/presentismo-node.git
cd presentismo-node
```

2. Instalar dependencias:
```bash
npm install
```

3. Copiar la base de datos SQLite a la carpeta `data/`:
```bash
mkdir data
cp /ruta/de/presentismo.db data/
```

4. Iniciar el servidor:
```bash
node src/app.js
```

5. Acceder desde el navegador:
```
http://localhost:3000
```

---

## Testing

El proyecto incluye tests unitarios sobre la lógica de dominio, escritos con [Jest](https://jestjs.io/).

### Instalación de dependencias de desarrollo

```bash
npm install --save-dev jest
```

### Correr los tests

```bash
npx jest
```

### Resultado esperado

```
PASS  __tests__/periodo.test.js
PASS  __tests__/tipo-ausencia.test.js
PASS  __tests__/calculadora-presentismo.test.js

Test Suites: 3 passed, 3 total
Tests:       32 passed, 32 total
Time:        ~1s
```

### Qué se testea

**`periodo.test.js` — Solapamiento de fechas**

El caso más crítico del sistema: ausencias que cruzan el límite entre dos meses.

```
ausencia: 29/09 → 02/10
período:  octubre
resultado: 2 días (01/10 y 02/10)
```

Cubre además: ausencias dentro del período, fuera del período, que cruzan el inicio,
que cruzan el fin, y que abarcan el mes completo. Incluye verificación de años bisiestos.

**`tipo-ausencia.test.js` — Reglas especiales**

Testea el motor de condiciones de `TipoAusencia`: evaluación de `parametrosEspeciales`,
resolución de clave y cálculo de tope según condiciones reales de las reglas **10J** y **13A**.

```
10J — Enfermedad familiar:
  discapacidad = true  → tope 30
  edad <= 12           → tope 5
  sin condición        → tope base

13A — Licencia por examen:
  nivel UNIVERSITARIO  → tope 10
  nivel SECUNDARIO     → tope 2
```

**`calculadora-presentismo.test.js` — Cálculo de presentismo**

Testea `CalculadoraPresentismo.analizar()` de extremo a extremo:

- Porcentajes según días descontables (0→100%, 1→70%, 2→40%, 3+→0%)
- Corte total por ausencia injustificada (`corta: true`)
- Ausencias dentro del tope → no descuentan
- Acumulación histórica que consume el tope antes del período de liquidación

### Estructura de los tests

```
presentismo-node/
└── __tests__/
    ├── periodo.test.js
    ├── tipo-ausencia.test.js
    └── calculadora-presentismo.test.js
```

---

## Estructura del proyecto

```
presentismo-node/
├── src/
│   ├── domain/
│   │   ├── entities/        # Ausencia, Empleado, Periodo, TipoAusencia
│   │   └── services/        # CalculadoraPresentismo, CatalogoTipoDeAusencia, ComparadorPremio
│   ├── application/
│   │   └── CalcularPresentismoUseCase.js
│   ├── infrastructure/
│   │   ├── readers/         # LectorCSV, LectorSueldos
│   │   └── persistence/     # SQLiteConnection, ReglaRepository
│   └── interfaces/
│       ├── controllers/     # AuthController, PresentismoController, ReglasController
│       ├── middlewares/     # authMiddleware
│       └── routes/          # auth, presentismo, reglas
├── public/                  # Frontend HTML + JS
├── data/                    # Base de datos SQLite
├── uploads/                 # Archivos temporales
└── package.json
```

---

## Decisiones técnicas

**Arquitectura hexagonal**
El dominio no depende de ninguna capa externa. Express, SQLite y los lectores de archivos son detalles intercambiables. Si mañana se cambia la base de datos, solo se modifica la capa de infraestructura.

**Migración de PHP a Node.js**
Este proyecto es la migración de un sistema existente en PHP con arquitectura MVC. El mayor desafío fue adaptar el modelo síncrono de PHP al modelo asíncrono de Node.js con async/await, manteniendo la lógica de negocio intacta.

**Reglas configurables desde la interfaz**
Las reglas de ausencias y sus condiciones especiales se almacenan en SQLite como JSON. Esto permite que el sistema se adapte a cambios en la normativa sin modificar el código.

**Procesamiento en memoria**
Todos los cálculos se realizan en memoria a partir de los archivos CSV cargados. SQLite se usa exclusivamente para autenticación y configuración.

**Detección automática de columnas en sueldos**
El lector de sueldos acepta CSV y Excel. Detecta automáticamente la hoja correcta por contenido y mapea las columnas por nombre en lugar de por posición.

**Motor de condiciones genérico**
Las reglas especiales se evalúan mediante un motor de condiciones configurable (campo + operador + valor), lo que permite agregar nuevos tipos de ausencias con lógica compleja sin escribir código adicional.

**Períodos dinámicos**
El sistema no tiene períodos hardcodeados. El usuario define ambos períodos en cada ejecución, lo que permite auditar retroactivos y liquidaciones históricas sin modificar el código.